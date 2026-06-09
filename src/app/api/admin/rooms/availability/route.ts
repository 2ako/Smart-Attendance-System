import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getAllRooms } from "@/lib/sanity/queries";

export const dynamic = "force-dynamic";

/**
 * Resolves a study field code or ID to its actual Sanity document ID
 */
async function resolveStudyFieldId(input: string | undefined): Promise<string | undefined> {
    if (!input) return undefined;
    const fieldId = await sanityClient.fetch(
        `*[_type == "studyField" && (code == $input || _id == $input)][0]._id`,
        { input }
    );
    return fieldId || input;
}

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get("date");
        const time = searchParams.get("time");

        if (!dateStr || !time) {
            return NextResponse.json({ message: "Missing date or time" }, { status: 400 });
        }

        // 1. Determine day of week
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const [year, month, day] = dateStr.split('-').map(Number);
        const dayOfWeek = days[new Date(year, month - 1, day).getDay()];

        // 2. Fetch all rooms (filtered by Admin's studyField if applicable)
        const resolvedId = await resolveStudyFieldId(user?.studyField);
        const allRooms = await sanityClient.fetch(getAllRooms, {
            studyField: user?.studyField || "",
            studyFieldId: resolvedId || user?.studyField || ""
        });

        // 3. Query existing schedule for conflicts (day + time)
        // Note: In schedule, room is a string (name) or a reference. 
        // Based on our investigation, it's often stored as a string or can be joined.
        const scheduleConflicts = await sanityClient.fetch(
            `*[_type == "schedule" && day == $dayOfWeek && startTime == $time]{
                room,
                "roomName": room->name
            }`,
            { dayOfWeek, time }
        );

        // 4. Query approved makeup requests for conflicts (date + time)
        const makeupConflicts = await sanityClient.fetch(
            `*[_type == "makeUpRequest" && requestedDate == $dateStr && requestedTime == $time && status == "approved"]{
                roomName
            }`,
            { dateStr, time }
        );

        // 5. Build set of busy room names
        const busyRooms = new Set<string>();
        scheduleConflicts.forEach((s: any) => {
            if (s.roomName) busyRooms.add(s.roomName);
            else if (typeof s.room === 'string') busyRooms.add(s.room);
        });
        makeupConflicts.forEach((m: any) => {
            if (m.roomName) busyRooms.add(m.roomName);
        });

        // 6. Filter available rooms
        const availableRooms = allRooms.filter((room: any) => !busyRooms.has(room.name));

        return NextResponse.json({ rooms: availableRooms });
    } catch (error: any) {
        console.error("GET Available Rooms Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
