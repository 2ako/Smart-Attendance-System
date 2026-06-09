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
        const { genes } = await req.json();
        
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
            return { day: DAYS[dayIdx] || "Saturday", ...SLOTS[slotIdx] };
        };

        // 1. Fetch old schedules to delete
        const oldSchedules = await sanityClient.fetch(`*[_type == "schedule"]{ _id }`);
        const deleteMutations = oldSchedules.map((s: any) => ({ delete: { id: s._id } }));

        // 2. Batch Create Schedules
        const createMutations = genes.map((gene: any) => {
            const info = getSlotInfo(gene.slotId);
            return {
                create: {
                    _type: "schedule",
                    subject: { _type: "reference", _ref: gene.subjectId },
                    professor: { _type: "reference", _ref: gene.professorId },
                    room: gene.roomId,
                    day: info.day,
                    startTime: info.start,
                    endTime: info.end,
                    groups: gene.groups
                }
            };
        });

        // 3. Execute Transaction
        await sanityClient.mutate([...deleteMutations, ...createMutations]);

        return NextResponse.json({ success: true, count: createMutations.length });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
