// ============================================================
// /api/admin/devices — CRUD operations for IoT Devices
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllDevices } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

/**
 * Resolves a study field code or ID to its actual Sanity document ID
 */
async function resolveStudyFieldId(input: string | undefined): Promise<string | undefined> {
    if (!input) return undefined;
    // Try to find the document ID by code OR ID
    const fieldId = await sanityClient.fetch(
        `*[_type == "studyField" && (code == $input || _id == $input)][0]._id`,
        { input }
    );
    return fieldId || input;
}

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin", "professor"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // Resolve ID for filtering new records with references
        const resolvedId = await resolveStudyFieldId(user?.studyField);

        const devices = await sanityClient.fetch(getAllDevices, {
            studyField: user?.studyField || "",
            studyFieldId: resolvedId || user?.studyField || ""
        });
        return NextResponse.json({ devices });
    } catch (error: any) {
        console.error("GET Devices Error:", error);
        return NextResponse.json({ message: error.message || "Failed to fetch devices" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { deviceId, deviceToken, roomId, type, isActive, studyFieldId } = body;

        if (!deviceId || !deviceToken) {
            return NextResponse.json({ message: "Device ID and Token are required" }, { status: 400 });
        }

        // Force Faculty Admin's studyField if present
        const rawStudyFieldId = user?.studyField || studyFieldId;
        const finalStudyFieldId = await resolveStudyFieldId(rawStudyFieldId);

        const deviceDoc: any = {
            _type: "device",
            deviceId,
            deviceToken,
            room: roomId ? { _type: "reference", _ref: roomId } : undefined,
            type: type || "rfid",
            isActive: isActive !== undefined ? isActive : true,
        };

        if (finalStudyFieldId) {
            deviceDoc.studyField = { _type: "reference", _ref: finalStudyFieldId };
        }

        const created = await sanityClient.create(deviceDoc);
        return NextResponse.json({ device: created }, { status: 201 });
    } catch (error: any) {
        console.error("POST Device Error:", error);
        return NextResponse.json({ message: error.message || "Failed to create device" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { _id, deviceId, deviceToken, roomId, type, isActive, studyFieldId } = body;

        if (!_id) return NextResponse.json({ id: "ID is required" }, { status: 400 });

        const patch: any = {
            deviceId,
            deviceToken,
            type,
            isActive,
        };

        // Force Faculty Admin's studyField if present
        const rawStudyFieldId = user?.studyField || studyFieldId;
        const finalStudyFieldId = await resolveStudyFieldId(rawStudyFieldId);

        if (finalStudyFieldId) {
            patch.studyField = { _type: "reference", _ref: finalStudyFieldId };
        }

        if (roomId) {
            patch.room = { _type: "reference", _ref: roomId };
        } else {
            patch.room = null;
        }

        const updated = await sanityClient.patch(_id).set(patch).commit();
        return NextResponse.json({ device: updated });
    } catch (error: any) {
        console.error("PUT Device Error:", error);
        return NextResponse.json({ message: error.message || "Failed to update device" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const id = new URL(req.url).searchParams.get("id");
        if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

        await sanityClient.delete(id);
        return NextResponse.json({ message: "Device deleted" });
    } catch (error: any) {
        console.error("DELETE Device Error:", error);
        return NextResponse.json({ message: error.message || "Failed to delete device" }, { status: 500 });
    }
}
