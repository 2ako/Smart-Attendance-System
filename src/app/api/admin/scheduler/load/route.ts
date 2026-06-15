import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { evaluateFitness } from "@/lib/scheduler/constraints";
import { Chromosome } from "@/lib/scheduler/types";

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
        // 1. Fetch Metadata first to get the latest batchId
        const metadata = await sanityClient.fetch(`*[_type == "scheduleMetadata"] | order(committedAt desc)[0]`);
        const latestBatchId = metadata?.batchId;
        console.log(`[Scheduler Load] Latest Metadata found: ${!!metadata}, BatchID: ${latestBatchId}`);

        // 2. Fetch only schedules belonging to the latest batch
        // If no batchId exists (legacy), fallback to isActive check but limited
        const query = latestBatchId 
            ? `*[_type == "schedule" && batchId == "${latestBatchId}" && isActive == true]`
            : `*[_type == "schedule" && isActive == true]`;

        const schedules = await sanityClient.fetch(`
            ${query}{
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
        
        console.log(`[Scheduler Load] Metadata used for stats logic: ${!!metadata}, ID: ${metadata?._id}`);
        if (metadata) {
            console.log(`[Scheduler Load] Raw Metadata Stats:`, {
                hard: metadata.hardConflicts,
                soft: metadata.softConflicts,
                fitness: metadata.fitness
            });
        }

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

        // ROOT FIX: Perform server-side evaluation if metadata is missing or incomplete
        // This ensures the stats are ALWAYS accurate according to the stored genes.
        const mockChromosome: Chromosome = {
            genes,
            fitness: 0,
            conflicts: [],
        };
        const evaluation = evaluateFitness(mockChromosome, true);

        // Use persisted stats if available, otherwise fallback to evaluation
        const stats = {
            fitness: metadata?.fitness ?? evaluation.stats?.fitness ?? 100,
            hardConflicts: metadata?.hardConflicts ?? evaluation.stats?.hardConflicts ?? 0,
            softConflicts: metadata?.softConflicts ?? evaluation.stats?.softConflicts ?? 0,
            saturdaySlots: metadata?.saturdaySlots ?? evaluation.stats?.saturdaySlots ?? 0,
            lateSlots: metadata?.lateSlots ?? evaluation.stats?.lateSlots ?? 0,
            totalSubjects: metadata?.totalSubjects || subjectsCount,
            totalRooms: metadata?.totalRooms || roomsCount,
        };

        return NextResponse.json({
            success: true,
            hasSchedule: true,
            schedule: {
                genes,
                fitness: stats.fitness,
                conflicts: metadata?.conflicts || evaluation.conflicts || []
            },
            infrastructure: {
                rooms: await sanityClient.fetch(`*[_type == "room"]{ _id, name, capacity, studyField }`)
            },
            stats,
            conflicts: metadata?.conflicts || evaluation.conflicts || [],
        });
    } catch (error: any) {
        console.error("Load Schedule Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
