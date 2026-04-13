// ============================================================
// /api/admin/rooms — CRUD operations for classrooms
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllRooms } from "@/lib/sanity/queries";
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
        // But keep the code for matching legacy string fields or GROQ match
        const resolvedId = await resolveStudyFieldId(user?.studyField);

        const rooms = await sanityClient.fetch(getAllRooms, {
            studyField: user?.studyField || "",
            studyFieldId: resolvedId || user?.studyField || ""
        });
        return NextResponse.json({ rooms });
    } catch (error: any) {
        console.error("GET Rooms Error:", error);
        return NextResponse.json({ message: error.message || "Failed to fetch rooms" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, capacity, floor, studyFieldId } = body;

        if (!name) {
            return NextResponse.json({ message: "Name is required" }, { status: 400 });
        }

        // Force Faculty Admin's studyField if present
        const rawStudyFieldId = user?.studyField || studyFieldId;
        const finalStudyFieldId = await resolveStudyFieldId(rawStudyFieldId);

        const room = await sanityClient.create({
            _type: "room",
            name,
            capacity: capacity ? Number(capacity) : undefined,
            floor: floor ? Number(floor) : undefined,
            studyField: finalStudyFieldId ? { _type: "reference", _ref: finalStudyFieldId } : undefined,
        });

        return NextResponse.json({ room }, { status: 201 });
    } catch (error: any) {
        console.error("POST Room Error:", error);
        return NextResponse.json({ message: error.message || "Failed to create room" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { _id, name, capacity, floor, studyFieldId } = body;

        if (!_id) return NextResponse.json({ message: "ID required" }, { status: 400 });

        const patch: any = {
            name,
            capacity: capacity ? Number(capacity) : undefined,
            floor: floor ? Number(floor) : undefined,
        };

        const rawStudyFieldId = user?.studyField || studyFieldId;
        const finalStudyFieldId = await resolveStudyFieldId(rawStudyFieldId);

        if (finalStudyFieldId) {
            patch.studyField = { _type: "reference", _ref: finalStudyFieldId };
        }

        const updated = await sanityClient.patch(_id).set(patch).commit();

        return NextResponse.json({ room: updated });
    } catch (error: any) {
        console.error("PUT Room Error:", error);
        return NextResponse.json({ message: error.message || "Failed to update room" }, { status: 500 });
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

        try {
            await sanityClient.delete(id);
            return NextResponse.json({ message: "Room deleted" });
        } catch (error: any) {
            if (error.message?.includes("reference")) {
                return NextResponse.json(
                    { message: "Cannot delete this room because it is assigned to one or more schedules or devices." },
                    { status: 409 }
                );
            }
            throw error;
        }
    } catch (error: any) {
        console.error("DELETE Room Error:", error);
        return NextResponse.json({ message: error.message || "Failed to delete room" }, { status: 500 });
    }
}
