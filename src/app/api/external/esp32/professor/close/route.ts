export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getDeviceByToken, getActiveSessionsByProfessor } from "@/lib/sanity/queries";

export async function POST(req: NextRequest) {
    try {
        // ── 1. Device Token Validation ─────────────────────────────────
        const token = req.headers.get("x-device-token");
        if (!token) {
            return NextResponse.json(
                { status: 401, code: "MISSING_TOKEN", description: "Token manquant" },
                { status: 401 }
            );
        }

        const device = await sanityClient.fetch(getDeviceByToken, { token } as any);
        if (!device) {
            return NextResponse.json(
                { status: 401, code: "INVALID_TOKEN", description: "Token invalide" },
                { status: 401 }
            );
        }

        // ── 2. Request Body (uid is RFID) ──────────────────────────────
        const { uid } = await req.json();
        if (!uid) {
            return NextResponse.json(
                { status: 400, code: "MISSING_UID", description: "UID est requis" },
                { status: 400 }
            );
        }

        // ── 3. Find Professor ─────────────────────────────────────────
        const professor = await sanityClient.fetch(`*[_type == "professor" && rfidUid == $uid][0]{ _id }`, { uid });
        if (!professor) {
            return NextResponse.json(
                { status: 404, code: "PROFESSOR_NOT_FOUND", description: "Professeur non reconnu" },
                { status: 404 }
            );
        }

        // ── 4. Find Active Session ────────────────────────────────────
        const activeSessions = await sanityClient.fetch(getActiveSessionsByProfessor, { professorId: professor._id });
        const existingSession = activeSessions && activeSessions.length > 0 ? activeSessions[0] : null;

        if (!existingSession) {
            return NextResponse.json(
                { status: 404, code: "NO_ACTIVE_SESSION", description: "Aucune جلسه نشطة لإغلاقها" },
                { status: 404 }
            );
        }

        // ── 5. Close Session & Materialize Absences ───────────────────
        const nowIso = new Date().toISOString();
        await sanityClient
            .patch(existingSession._id)
            .set({ status: "closed", endTime: nowIso })
            .commit();

        try {
            // Materialize absences (Same logic as manual closure)
            // Need subject details from the session
            const sessionDetails = await sanityClient.fetch(`*[_type == "session" && _id == $id][0]{
                "subject": schedule->subject->{ level, specialty, group, studyField }
            }`, { id: existingSession._id });

            if (sessionDetails?.subject) {
                const { getSessionCohort } = await import("@/lib/sanity/queries");
                const cohort = await sanityClient.fetch(getSessionCohort, {
                    sessionId: existingSession._id,
                    level: sessionDetails.subject.level,
                    studyField: sessionDetails.subject.studyField,
                    specialty: sessionDetails.subject.specialty || null,
                    group: sessionDetails.subject.group || null,
                });

                const absentees = cohort.filter((s: any) => !s.attendance);
                if (absentees.length > 0) {
                    const transaction = sanityClient.transaction();
                    absentees.forEach((student: any) => {
                        transaction.create({
                            _type: "attendance",
                            session: { _type: "reference", _ref: existingSession._id },
                            student: { _type: "reference", _ref: student._id },
                            timestamp: nowIso,
                            status: "absent",
                            markedBy: "manual",
                            isJustified: false
                        });
                    });
                    await transaction.commit();

                    const { checkAbsenceThreshold } = await import("@/lib/attendance-logic");
                    for (const student of absentees) {
                        await checkAbsenceThreshold(student._id);
                    }
                }
            }
        } catch (absentErr) {
            console.error("ESP32 Button Closure Absences Error:", absentErr);
        }

        return NextResponse.json(
            { status: 200, code: "SESSION_CLOSED", session_id: existingSession._id },
            { status: 200 }
        );

    } catch (error) {
        console.error("ESP32 Close Button API Error:", error);
        return NextResponse.json(
            { status: 500, code: "SERVER_ERROR", description: "Erreur serveur" },
            { status: 500 }
        );
    }
}
