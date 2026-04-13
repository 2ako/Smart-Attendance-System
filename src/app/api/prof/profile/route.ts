// ============================================================
// GET /api/prof/profile — Fetch profile for logged-in professor
// ============================================================

import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getProfessorByUserId, getActiveSessionsByProfessor } from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "professor") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const professor = await sanityClient.fetch(getProfessorByUserId, { userId: user.id });

        if (!professor) {
            return NextResponse.json({ message: "Professor record not found" }, { status: 404 });
        }

        // Also fetch active sessions to keep it consistent with the dashboard's needs
        const activeSessions = await sanityClient.fetch(getActiveSessionsByProfessor, { professorId: professor._id });

        return NextResponse.json({
            professor,
            activeSession: activeSessions && activeSessions.length > 0 ? activeSessions[0] : null
        });
    } catch (error: any) {
        console.error("Error fetching professor profile:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
