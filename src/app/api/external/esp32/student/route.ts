export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getDeviceByToken, getStudentByRfid } from "@/lib/sanity/queries";

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

        // ── 2. Request Body ───────────────────────────────────────────
        const { uid, Session_ID } = await req.json();

        // ── 3. Basic Validation ───────────────────────────────────────
        if (!uid || !Session_ID) {
            return NextResponse.json(
                { status: 400, code: "MISSING_FIELDS", description: "UID et Session_ID requis" },
                { status: 400 }
            );
        }

        // ── 4. Session Validation ─────────────────────────────────────
        const session = await sanityClient.fetch(
            `*[_type == "session" && _id == $id][0]{
                ...,
                "subject": schedule->subject->{ type, level, specialty, group, studyField }
            }`,
            { id: Session_ID }
        );

        if (!session) {
            return NextResponse.json(
                { status: 404, code: "SESSION_NOT_FOUND", description: "Session introuvable" },
                { status: 404 }
            );
        }

        if (session.status !== "open") {
            return NextResponse.json(
                { status: 400, code: "SESSION_CLOSED", description: "Cette session est fermée" },
                { status: 400 }
            );
        }

        const now = new Date();
        if (new Date(session.endTime) < now) {
            return NextResponse.json(
                { status: 400, code: "SESSION_EXPIRED", description: "Cette session a expiré" },
                { status: 400 }
            );
        }

        // ── 5. Student Identification (RFID) ──────────────────────────
        const student = await sanityClient.fetch(getStudentByRfid, { rfidUid: uid });
        if (!student) {
            return NextResponse.json(
                { status: 404, code: "STUDENT_NOT_FOUND", description: "Étudiant non reconnu" },
                { status: 404 }
            );
        }

        // ── 6. Academic Validation ────────────────────────────────────
        const subject = session.subject;
        if (subject) {
            const studentLevel = student.level?.trim().toUpperCase();
            const subLevel = subject.level?.trim().toUpperCase();
            const studentField = student.studyField?.trim().toLowerCase();
            const subField = subject.studyField?.trim().toLowerCase();
            const subType = subject.type?.trim().toLowerCase();

            if (studentLevel !== subLevel || studentField !== subField) {
                return NextResponse.json(
                    { status: 400, code: "ACADEMIC_MISMATCH", description: "Niveau ou filière incorrect" },
                    { status: 400 }
                );
            }

            if ((subType === "td" || subType === "tp") &&
                student.group?.trim().toUpperCase() !== subject.group?.trim().toUpperCase()) {
                return NextResponse.json(
                    { status: 400, code: "GROUP_MISMATCH", description: "Groupe incorrect pour cette session" },
                    { status: 400 }
                );
            }
        }

        // ── 7. Check Duplicate ────────────────────────────────────────
        const existing = await sanityClient.fetch(
            `*[_type == "attendance" && session._ref == $sessionId && student._ref == $studentId][0]`,
            { sessionId: Session_ID, studentId: student._id }
        );

        if (existing) {
            return NextResponse.json(
                { status: 200, code: "ALREADY_MARKED", session_id: Session_ID },
                { status: 200 }
            );
        }

        // ── 8. Mark Attendance ────────────────────────────────────────
        const systemSettings = await sanityClient.fetch(`*[_type == "systemConfig"][0]{gracePeriodMinutes}`);
        const gracePeriod = systemSettings?.gracePeriodMinutes ?? 15;

        const sessionStart = new Date(session.startTime);
        const diffMinutes = (now.getTime() - sessionStart.getTime()) / (1000 * 60);
        const attendanceStatus = diffMinutes > gracePeriod ? "late" : "present";

        await sanityClient.create({
            _type: "attendance",
            session: { _type: "reference", _ref: Session_ID },
            student: { _type: "reference", _ref: student._id },
            timestamp: now.toISOString(),
            status: attendanceStatus,
            timeIn: now.toISOString(),
            markedBy: "device",
        });

        // Notify student (optional/fire-and-forget)
        try {
            await sanityClient.create({
                _type: "notification",
                recipient: { _type: "reference", _ref: student._id },
                type: `attendance_${attendanceStatus}`,
                title: "Attendance Marked",
                message: `You have been marked ${attendanceStatus} for your session.`,
                isRead: false,
                createdAt: now.toISOString(),
            });
        } catch (e) { }

        // Update device status
        await sanityClient.patch(device._id).set({ lastSeen: now.toISOString() }).commit();

        return NextResponse.json(
            { status: 200, code: "ATTENDANCE_MARKED", session_id: Session_ID },
            { status: 200 }
        );

    } catch (error) {
        console.error("ESP32 Student API Error:", error);
        return NextResponse.json(
            { status: 500, code: "SERVER_ERROR", description: "Erreur serveur" },
            { status: 500 }
        );
    }
}
