export const dynamic = "force-dynamic";
// ============================================================
// /api/sessions — Session management (open, close, extend)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getActiveSessionsByProfessor, getProfessorByUserId, getActiveSessionBySchedule } from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["professor", "admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");

    if (sessionId) {
        const session = await sanityClient.fetch(
            `*[_type == "session" && _id == $id][0]{
        ...,
        schedule->{ ..., subject->{ name, code }, room->{ name, building } }
      }`,
            { id: sessionId }
        );
        return NextResponse.json({ session });
    }

    // Get professor's active sessions
    const professor = await sanityClient.fetch(getProfessorByUserId, { userId: user!.id });
    if (!professor) return NextResponse.json({ sessions: [] });

    const sessions = await sanityClient.fetch(getActiveSessionsByProfessor, { professorId: professor._id });
    return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["professor"])) {
        return NextResponse.json({ message: "Only professors can open sessions" }, { status: 403 });
    }

    // --- Local Server Guard ---
    if (process.env.IS_LOCAL_SERVER !== "true") {
        return NextResponse.json(
            { message: "Manual session opening is only allowed from the college's local server. Please use the RFID device in your classroom." },
            { status: 403 }
        );
    }

    const { scheduleId, duration = 90 } = await req.json();

    const professor = await sanityClient.fetch(getProfessorByUserId, { userId: user!.id });
    if (!professor) {
        return NextResponse.json({ message: "Professor profile not found" }, { status: 404 });
    }

    // Prevent duplicate open sessions for same schedule
    const existing = await sanityClient.fetch(getActiveSessionBySchedule, { scheduleId });
    if (existing) {
        return NextResponse.json({ message: "Session already active", sessionId: existing._id }, { status: 400 });
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60 * 1000);

    const session = await sanityClient.create({
        _type: "session",
        schedule: { _type: "reference", _ref: scheduleId },
        professor: { _type: "reference", _ref: professor._id },
        status: "open",
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        duration,
    });

    return NextResponse.json({ session }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["professor", "admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { sessionId, action, extraMinutes } = await req.json();

    if (action === "close") {
        const session = await sanityClient.fetch(`*[_type == "session" && _id == $id][0]{
            ...,
            "subject": schedule->subject->{ level, specialty, group, studyField }
        }`, { id: sessionId });

        if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });

        // 1. Close the session
        const updated = await sanityClient
            .patch(sessionId)
            .set({ status: "closed", endTime: new Date().toISOString() })
            .commit();

        // 2. Materialize absences
        try {
            const { getSessionCohort } = await import("@/lib/sanity/queries");
            const cohort = await sanityClient.fetch(getSessionCohort, {
                sessionId,
                level: session.subject.level,
                studyField: session.subject.studyField,
                specialty: session.subject.specialty || null,
                group: session.subject.group || null,
            });

            const absentees = cohort.filter((s: any) => !s.attendance);
            if (absentees.length > 0) {
                const transaction = sanityClient.transaction();
                absentees.forEach((student: any) => {
                    transaction.create({
                        _type: "attendance",
                        session: { _type: "reference", _ref: sessionId },
                        student: { _type: "reference", _ref: student._id },
                        timestamp: new Date().toISOString(),
                        status: "absent",
                        markedBy: "manual",
                        isJustified: false
                    });
                });
                await transaction.commit();

                // ── 3. Check Threshold & Notify ──
                const { checkAbsenceThreshold } = await import("@/lib/attendance-logic");
                for (const student of absentees) {
                    await checkAbsenceThreshold(student._id);
                }
            }
        } catch (absentErr) {
            console.error("Error materializing absences:", absentErr);
        }

        return NextResponse.json({ session: updated });
    }

    if (action === "extend") {
        const session = await sanityClient.fetch(`*[_type == "session" && _id == $id][0]`, { id: sessionId });
        if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });

        const currentEnd = new Date(session.endTime);
        const minutesToExtend = extraMinutes || 10;
        const newEnd = new Date(currentEnd.getTime() + minutesToExtend * 60 * 1000);
        
        const updated = await sanityClient
            .patch(sessionId)
            .set({ 
                endTime: newEnd.toISOString(), 
                duration: (session.duration || 90) + minutesToExtend 
            })
            .commit();

        return NextResponse.json({ session: updated });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
}
