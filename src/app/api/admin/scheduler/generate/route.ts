import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { SchedulerEngine } from "@/lib/scheduler/engine";

export async function GET() {
    try {
        // 1. Fetch academic data
        const subjects = await sanityClient.fetch(`*[_type == "subject" && defined(professor)]{
            _id, name, code, level, specialty, groups, type,
            professor->{ _id, name }
        }`);
        
        const rooms = await sanityClient.fetch(`*[_type == "room"]{
            _id, name, capacity, studyField->{ name }
        }`);

        const professors = await sanityClient.fetch(`*[_type == "professor"]{
            _id, name
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
            existingSchedules
        });

        if (subjects.length === 0) {
            return NextResponse.json({ success: false, error: "No subjects with assigned professors found." }, { status: 400 });
        }

        const result = await engine.generate();

        return NextResponse.json({
            success: true,
            schedule: result,
            stats: {
                totalSubjects: subjects.length,
                totalRooms: rooms.length,
                fitness: result.fitness,
                conflicts: result.conflicts
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
                { start: "09:40", end: "11:10" },
                { start: "11:20", end: "12:50" },
                { start: "13:10", end: "14:40" },
                { start: "14:50", end: "16:20" },
                { start: "16:30", end: "18:00" },
            ];
            const dayIdx = Math.floor(slotId / 6);
            const slotIdx = slotId % 6;
            return { day: DAYS[dayIdx], ...SLOTS[slotIdx] };
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
