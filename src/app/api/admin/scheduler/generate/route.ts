import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { SchedulerEngine } from "@/lib/scheduler/engine";

export async function GET() {
    try {
        const allSubjects = await sanityClient.fetch(`*[_type == "subject"]{ _id }`);
        // 1. Fetch academic data
        const subjects = await sanityClient.fetch(`*[_type == "subject"]{
            _id, name, code, level, specialty, studyField->{ name, code }, groups, type,
            professor->{ _id, firstName, lastName, user->{ name } }
        }`);
        
        console.log(`[Scheduler API] Total Subjects Fetched: ${subjects.length}`);
        
        const rooms = await sanityClient.fetch(`*[_type == "room"]{
            _id, name, capacity, studyField->{ _id, name, code }
        }`);

        const professors = await sanityClient.fetch(`*[_type == "professor"]{
            _id, firstName, lastName, user->{ name }
        }`);

        const existingSchedules = await sanityClient.fetch(`*[_type == "schedule"]{
            _id, day, startTime, endTime, room,
            subject->{ _id, name, code, type },
            room,
            groups
        } | order(day asc, startTime asc)`);

        // 2. Run Engine
        const engine = new SchedulerEngine({
            subjects,
            rooms,
            professors,
            existingSchedules: [] // Don't constrain by old schedules during regeneration
        });

        if (subjects.length === 0) {
            return NextResponse.json({ success: false, error: "No subjects found in database." }, { status: 400 });
        }

        const result = await engine.generate();

        return NextResponse.json({
            success: true,
            schedule: result,
            infrastructure: { rooms },
            stats: {
                totalSubjects: subjects.length,
                totalRooms: rooms.length,
                ...result.stats
            }
        });
    } catch (error: any) {
        console.error("Scheduler API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { genes, stats, conflicts: detailedConflicts } = await req.json();

        if (!genes || !Array.isArray(genes)) {
            return NextResponse.json({ error: "Invalid genes data" }, { status: 400 });
        }

        // Helper to get time from slotId
        const getSlotInfo = (slotId: number) => {
            const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
            const SLOTS = [
                { start: "08:00", end: "09:30" },
                { start: "09:30", end: "11:00" },
                { start: "11:00", end: "12:30" },
                { start: "12:30", end: "14:00" },
                { start: "14:00", end: "15:30" },
                { start: "15:30", end: "17:00" },
            ];
            const dayIdx = Math.floor(slotId / 6);
            const slotIdx = slotId % 6;
            return { day: DAYS[dayIdx] || "Saturday", ...(SLOTS[slotIdx] || SLOTS[0]) };
        };

        // 1. Fetch currently active schedules
        const oldSchedules = await sanityClient.fetch(`*[_type == "schedule" && coalesce(isActive, true) == true]{ _id }`);
        
        // 1.5 Delete old metadata
        const oldMetadata = await sanityClient.fetch(`*[_type == "scheduleMetadata"]{ _id }`);
        if (oldMetadata.length > 0) {
            for (const meta of oldMetadata) {
                await sanityClient.delete(meta._id);
            }
        }

        let deletedCount = 0;
        let archivedCount = 0;

        // 2. Clear old schedules safely (Delete or Archive)
        if (oldSchedules.length > 0) {
            console.log(`[Scheduler Commit] Processing ${oldSchedules.length} active schedules...`);
            for (const schedule of oldSchedules) {
                try {
                    await sanityClient.delete(schedule._id);
                    deletedCount++;
                } catch (e: any) {
                    console.warn(`[Scheduler Commit] Could not delete schedule ${schedule._id}, archiving instead.`);
                    try {
                        await sanityClient.patch(schedule._id).set({ isActive: false }).commit();
                        archivedCount++;
                    } catch (patchErr: any) {
                        console.error(`[Scheduler Commit] Failed to archive schedule ${schedule._id}:`, patchErr);
                    }
                }
            }
        }

        // 3. Batch Create New Schedules
        const validGenes = genes.filter((g: any) => g.subjectId && typeof g.subjectId === "string" && g.subjectId.length > 0);

        const mutations = validGenes.map((gene: any) => {
            const info = getSlotInfo(gene.slotId);
            const doc: any = {
                _type: "schedule",
                subject: { _type: "reference", _ref: gene.subjectId },
                room: gene.roomId || "Unknown",
                day: info.day,
                startTime: info.start,
                endTime: info.end,
                groups: gene.groups || [],
                isActive: true,
            };

            if (gene.professorId && typeof gene.professorId === "string" && gene.professorId.length > 0) {
                doc.professor = { _type: "reference", _ref: gene.professorId };
            }

            return { create: doc };
        });

        // 3.5 Create metadata
        if (stats) {
            mutations.push({
                create: {
                    _type: "scheduleMetadata",
                    fitness: stats.fitness,
                    hardConflicts: stats.hardConflicts,
                    softConflicts: stats.softConflicts,
                    saturdaySlots: stats.saturdaySlots,
                    lateSlots: stats.lateSlots,
                    totalSubjects: stats.totalSubjects,
                    totalRooms: stats.totalRooms,
                    conflicts: detailedConflicts || [],
                    committedAt: new Date().toISOString()
                }
            } as any);
        }

        // 4. Execute transaction to save
        if (mutations.length > 0) {
            await sanityClient.mutate(mutations);
        }

        return NextResponse.json({ 
            success: true, 
            count: validGenes.length,
            deletedCount,
            archivedCount
        });
    } catch (error: any) {
        console.error("Commit Schedule Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
