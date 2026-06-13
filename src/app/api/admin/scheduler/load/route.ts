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
            *[_type == "schedule" && coalesce(isActive, true) == true]{
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
                    level,
                    specialty,
                    studyField
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

        const roomsCount = await sanityClient.fetch(`count(*[_type == "room"])`);
        const subjectsCount = await sanityClient.fetch(`count(*[_type == "subject"])`);

        // Fetch Metadata - Get the latest committed metadata
        const metadata = await sanityClient.fetch(`*[_type == "scheduleMetadata"] | order(committedAt desc)[0]`);
        console.log(`[Scheduler Load] Metadata found: ${!!metadata}`);

        // Convert Sanity schedule records back into gene format
        const genes = schedules.map((s: any, idx: number) => {
            const sub = s.subject;
            const prof = s.professor;
            const slotId = getSlotId(s.day, s.startTime);

            // In our schema, level and specialty are plain strings
            const levelLabel = sub?.level || "L1";
            const specialtyLabel = sub?.specialty || "None";

            const profName = prof
                ? ((prof.firstName || prof.lastName)
                    ? `${prof.firstName || ""} ${prof.lastName || ""}`.trim()
                    : prof.user?.name || "Unknown")
                : "Unknown";

            return {
                subjectId: sub?._id || "",
                subjectName: sub?.name || "Unknown Subject",
                professorId: prof?._id || "",
                professorName: profName,
                roomId: s.room || "Unknown Room",
                slotId,
                groups: s.groups || [],
                type: sub?.type || "Cours",
                levelName: levelLabel,
                specialtyName: specialtyLabel,
                studyField: sub?.studyField || "",
                // Index fields for internal logic
                subjectIdx: idx,
            };
        });

        // Use persisted stats if available, otherwise fallback to basic counts
        // Use ?? 0 to strictly ensure numbers for the frontend
        const stats = metadata ? {
            fitness: metadata.fitness ?? 100,
            hardConflicts: metadata.hardConflicts ?? 0,
            softConflicts: metadata.softConflicts ?? 0,
            saturdaySlots: metadata.saturdaySlots ?? 0,
            lateSlots: metadata.lateSlots ?? 0,
            totalSubjects: metadata.totalSubjects || subjectsCount,
            totalRooms: metadata.totalRooms || roomsCount,
        } : {
            totalSubjects: subjectsCount,
            totalRooms: roomsCount,
            hardConflicts: 0,
            softConflicts: 0,
            saturdaySlots: genes.filter((g: any) => g.slotId < 6).length,
            lateSlots: genes.filter((g: any) => g.slotId % 6 >= 4).length,
        };

        return NextResponse.json({
            success: true,
            hasSchedule: true,
            schedule: {
                genes,
                fitness: metadata?.fitness || 100,
                conflicts: metadata?.conflicts || []
            },
            infrastructure: {
                rooms: await sanityClient.fetch(`*[_type == "room"]{ _id, name, capacity, studyField }`)
            },
            stats,
            conflicts: metadata?.conflicts || [],
        });
    } catch (error: any) {
        console.error("Load Schedule Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
