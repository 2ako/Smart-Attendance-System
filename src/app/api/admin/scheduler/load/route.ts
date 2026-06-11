import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";

export const dynamic = "force-dynamic";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [
    { start: "08:00", end: "09:30" },
    { start: "09:30", end: "11:00" },
    { start: "11:00", end: "12:30" },
    { start: "12:30", end: "14:00" },
    { start: "14:00", end: "15:30" },
    { start: "15:30", end: "17:00" },
];

function getSlotId(day: string, startTime: string): number {
    const dayIdx = DAYS.findIndex(d => d.toLowerCase() === day.toLowerCase());
    const slotIdx = SLOTS.findIndex(s => s.start === startTime);
    if (dayIdx === -1 || slotIdx === -1) return 0;
    return dayIdx * 6 + slotIdx;
}

export async function GET() {
    try {
        const schedules = await sanityClient.fetch(`
            *[_type == "schedule"]{
                _id,
                day,
                startTime,
                endTime,
                room,
                groups,
                subject->{
                    _id,
                    name,
                    code,
                    type,
                    level->{ _id, name, code },
                    specialty->{ _id, name, code },
                    studyField->{ _id, name, code }
                },
                professor->{
                    _id,
                    firstName,
                    lastName,
                    user->{ name }
                }
            } | order(day asc, startTime asc)
        `);

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ success: true, hasSchedule: false });
        }

        const rooms = await sanityClient.fetch(`*[_type == "room"]{ _id, name, capacity, studyField->{ _id, name, code } }`);
        const subjects = await sanityClient.fetch(`*[_type == "subject"]{ _id }`);

        // Convert Sanity schedule records back into gene format
        const genes = schedules.map((s: any, idx: number) => {
            const sub = s.subject;
            const prof = s.professor;
            const slotId = getSlotId(s.day, s.startTime);

            const levelName = sub?.level?.name || sub?.level?.code || sub?.level || "";
            const specialtyName = sub?.specialty?.name || sub?.specialty?.code || sub?.specialty || "";

            const profName = prof
                ? ((prof.firstName || prof.lastName)
                    ? `${prof.firstName || ""} ${prof.lastName || ""}`.trim()
                    : prof.user?.name || "Unknown")
                : "Unknown";

            return {
                // Identifiers
                subjectId: sub?._id || "",
                subjectName: sub?.name || "Unknown Subject",
                professorId: prof?._id || "",
                professorName: profName,
                roomId: s.room || "Unknown Room",

                // Scheduling
                slotId,
                groups: s.groups || [],
                type: sub?.type || "Cours",

                // Academic hierarchy
                level: sub?.level?._id || sub?.level || levelName,
                levelName,
                specialty: sub?.specialty?._id || sub?.specialty || specialtyName,
                specialtyName,
                studyField: sub?.studyField?.code || sub?.studyField?.name || "",

                // Indices (set to -1 since we don't have the engine context)
                profIdx: -1,
                roomIdx: -1,
                levelIdx: -1,
                specIdx: -1,
                subjectIdx: idx,
                groupMask: 0,
                specialtyGroupCount: 0,
            };
        });

        // Reconstruct stats (lightweight)
        const stats = {
            totalSubjects: subjects.length,
            totalRooms: rooms.length,
            hardConflicts: 0,
            softConflicts: 0,
            saturdaySlots: genes.filter((g: any) => g.slotId < 6).length,
            lateSlots: genes.filter((g: any) => g.slotId % 6 >= 4).length,
        };

        return NextResponse.json({
            success: true,
            hasSchedule: true,
            schedule: { genes, fitness: 0, conflicts: [] },
            infrastructure: { rooms },
            stats,
            conflicts: [],
        });
    } catch (error: any) {
        console.error("Load Schedule Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
