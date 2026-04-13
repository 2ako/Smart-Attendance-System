export const dynamic = "force-dynamic";
// ============================================================
// GET /api/prof/history — Fetch session history for professor
// ============================================================

import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getProfessorByUserId, getAllSessionsByProfessor } from "@/lib/sanity/queries";
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

        // 2. Fetch session history
        const sessions = await sanityClient.fetch(getAllSessionsByProfessor, { professorId: professor._id });

        return NextResponse.json({ sessions: sessions || [] });
    } catch (error: any) {
        console.error("Error fetching professor history:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
