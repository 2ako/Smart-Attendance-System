// ============================================================
// /api/devices — CRUD operations for IoT devices
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllDevices } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const resolvedId = user?.studyField ? await sanityClient.fetch(`*[_type == "studyField" && (code == $code || _id == $code)][0]._id`, { code: user.studyField }) : "";
    const devices = await sanityClient.fetch(getAllDevices, {
        studyField: user?.studyField || "",
        studyFieldId: resolvedId || user?.studyField || ""
    });
    return NextResponse.json({ devices });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const deviceToken = crypto.randomBytes(32).toString("hex");
    const doc = await sanityClient.create({
        _type: "device",
        deviceId: body.deviceId,
        deviceToken,
        room: body.roomId ? { _type: "reference", _ref: body.roomId } : undefined,
        type: body.type || "rfid",
        isActive: true,
    });
    return NextResponse.json({ device: { ...doc, deviceToken } }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { _id, roomId, type, isActive } = await req.json();
    const patch: any = {};
    if (type) patch.type = type;
    if (typeof isActive === "boolean") patch.isActive = isActive;
    if (roomId) patch.room = { _type: "reference", _ref: roomId };

    const updated = await sanityClient.patch(_id).set(patch).commit();
    return NextResponse.json({ device: updated });
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });
    await sanityClient.delete(id);
    return NextResponse.json({ message: "Device deleted" });
}
