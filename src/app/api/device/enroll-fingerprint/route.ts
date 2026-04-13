export const dynamic = "force-dynamic";
// ============================================================
// POST /api/device/enroll-fingerprint — ESP32 enrolls fingerprint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getDeviceByToken } from "@/lib/sanity/queries";

export async function POST(req: NextRequest) {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) {
        return NextResponse.json({ ok: false, error: "Missing device token" }, { status: 401 });
    }

    const device = await sanityClient.fetch(getDeviceByToken, { token: deviceToken } as any);
    if (!device) {
        return NextResponse.json({ ok: false, error: "Invalid device" }, { status: 403 });
    }

    const { studentId, fingerprintId, templateData } = await req.json();
    if (!studentId || !fingerprintId) {
        return NextResponse.json({ ok: false, error: "studentId and fingerprintId required" }, { status: 400 });
    }

    // Create fingerprint record
    const fingerprint = await sanityClient.create({
        _type: "fingerprint",
        student: { _type: "reference", _ref: studentId },
        fingerprintId,
        templateData: templateData || "",
    });

    // Update student's fingerprintId
    await sanityClient.patch(studentId).set({ fingerprintId }).commit();

    return NextResponse.json({
        ok: true,
        fingerprintDocId: fingerprint._id,
        fingerprintId,
    });
}
