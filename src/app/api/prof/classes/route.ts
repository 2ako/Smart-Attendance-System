export const dynamic = "force-dynamic";
// ============================================================
// GET /api/prof/classes — Fetch classes and schedules for professor
// ============================================================

import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import {
    getProfessorByUserId,
    getSchedulesByProfessor,
    getActiveSessionsByProfessor,
    getSubjectsByProfessor
} from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "professor") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // 1. Get professor document
        const professor = await sanityClient.fetch(getProfessorByUserId, { userId: user.id });
        if (!professor) {
            return NextResponse.json({ message: "Professor record not found" }, { status: 404 });
        }

        // 2. Fetch schedules and active sessions
        const [schedules, activeSessions, subjects] = await Promise.all([
            sanityClient.fetch(getSchedulesByProfessor, { professorId: professor._id }),
            sanityClient.fetch(getActiveSessionsByProfessor, { professorId: professor._id }),
            sanityClient.fetch(getSubjectsByProfessor, { professorId: professor._id })
        ]);

        return NextResponse.json({
            professor,
            schedules: schedules || [],
            activeSessions: activeSessions || [],
            subjects: subjects || []
        });
    } catch (error: any) {
        console.error("Error fetching professor classes:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
