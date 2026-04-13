export const dynamic = "force-dynamic";
// ============================================================
// GET /api/device/session-status — ESP32 checks session state
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getDeviceByToken } from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) {
        return NextResponse.json({ ok: false, error: "Missing device token" }, { status: 401 });
    }

    const device = await sanityClient.fetch(getDeviceByToken, { token: deviceToken } as any);
    if (!device) {
        return NextResponse.json({ ok: false, error: "Invalid device" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
        return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
    }

    const session = await sanityClient.fetch(
        `*[_type == "session" && _id == $id][0]{ status, startTime, endTime, duration }`,
        { id: sessionId }
    );

    if (!session) {
        return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    // Auto-close expired sessions
    if (session.status === "open" && new Date(session.endTime) < new Date()) {
        await sanityClient.patch(sessionId).set({ status: "closed" }).commit();
        session.status = "closed";
    }

    return NextResponse.json({
        ok: true,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        remainingSeconds: Math.max(
            0,
            Math.floor((new Date(session.endTime).getTime() - Date.now()) / 1000)
        ),
    });
}
