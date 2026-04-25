export const dynamic = "force-dynamic";
// ============================================================
// POST /api/device/mark-attendance — ESP32 marks attendance
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getDeviceByToken, getStudentByRfid, getStudentByFingerprint } from "@/lib/sanity/queries";

export async function POST(req: NextRequest) {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) {
        return NextResponse.json({ ok: false, error: "Missing device token" }, { status: 401 });
    }

    const device = await sanityClient.fetch(getDeviceByToken, { token: deviceToken } as any);
    if (!device) {
        return NextResponse.json({ ok: false, error: "Invalid device" }, { status: 403 });
    }

    const { sessionId, rfidUid, fingerprintId } = await req.json();
    if (!sessionId) {
        return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
    }

    // 1. Validate session is open and NOT expired
    const session = await sanityClient.fetch(
        `*[_type == "session" && _id == $id && status == "open" && dateTime(endTime) > dateTime(now())][0]`,
        { id: sessionId }
    );

    if (!session) {
        return NextResponse.json({ ok: false, error: "Session not active or expired" }, { status: 400 });
    }

    // Fetch Subject details for validation (Handles both regular and make-up sessions)
    const sessionWithSubject = await sanityClient.fetch(
        `*[_type == "session" && _id == $id][0]{
            ...,
            "subject": coalesce(
                schedule->subject->{ type, level, specialty, group, studyField },
                subject->{ type, level, specialty, group, studyField }
            )
        }`,
        { id: sessionId }
    );
    const subject = sessionWithSubject?.subject;

    if (!subject) {
        return NextResponse.json({ ok: false, error: "Subject details not found for session" }, { status: 404 });
    }

    // 2. Identify Student (Fingerprint First, then RFID for Enrollment)
    let student = null;
    let enrollmentOccurred = false;

    if (fingerprintId) {
        student = await sanityClient.fetch(getStudentByFingerprint, { fingerprintId });
    }

    // 3. Enrollment Logic: If fingerprint not recognized but RFID provided
    if (!student && rfidUid && fingerprintId) {
        student = await sanityClient.fetch(getStudentByRfid, { rfidUid });
        if (student) {
            // Link fingerprintId to this student (Enrollment)
            await sanityClient
                .patch(student._id)
                .set({ fingerprintId: Number(fingerprintId) })
                .commit();
            enrollmentOccurred = true;
        }
    }

    if (!student) {
        return NextResponse.json({
            ok: false,
            error: "Student not found",
            needsEnrollment: !!fingerprintId && !rfidUid
        }, { status: 404 });
    }

    // ── Validation Logic ──────────────────────────────────────
    // Helper to extract string value from potential reference or nested object
    const getString = (val: any) => {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (val.code) return val.code;
        if (val.name) return val.name;
        if (val.title) return val.title;
        return "";
    };

    const studentLevel = getString(student.level).trim().toUpperCase();
    const subLevel = getString(subject.level).trim().toUpperCase();
    const studentField = getString(student.studyField).trim().toLowerCase();
    const subField = getString(subject.studyField).trim().toLowerCase();
    const studentSpecialty = getString(student.specialty).trim().toLowerCase();
    const subSpecialty = getString(subject.specialty).trim().toLowerCase();
    const subType = (subject.type || "").trim().toLowerCase();

    // 1. Level and StudyField MUST match always
    const fieldMatch = studentField === subField || 
                     (studentField.length > 2 && subField.startsWith(studentField)) ||
                     (subField.length > 2 && studentField.startsWith(subField));

    if (studentLevel !== subLevel || !fieldMatch) {
        return NextResponse.json({ 
            ok: false, 
            error: `Level/Field mismatch: Student(${studentLevel}/${studentField}) vs Session(${subLevel}/${subField})` 
        }, { status: 400 });
    }

    // 2. Specialty must match if defined on subject
    if (subSpecialty && subSpecialty !== "all" && subSpecialty !== "none") {
        if (studentSpecialty !== subSpecialty) {
            return NextResponse.json({ ok: false, error: "Specialty mismatch" }, { status: 400 });
        }
    }

    // 3. Group match based on Type
    if (subType === "td" || subType === "tp") {
        const sessionGroup = getString(sessionWithSubject?.group).trim().toUpperCase();
        const subGroup = getString(subject.group).trim().toUpperCase();
        const targetGroup = sessionGroup || subGroup;

        if (targetGroup && targetGroup !== "ALL") {
            if (student.group?.trim().toUpperCase() !== targetGroup) {
                return NextResponse.json({
                    ok: false,
                    error: `Group mismatch: Your group (${student.group}) doesn't match session (${targetGroup})`
                }, { status: 400 });
            }
        }
    }
    // ──────────────────────────────────────────────────────────

    // 4. Prevent duplicate attendance
    const existing = await sanityClient.fetch(
        `*[_type == "attendance" && session._ref == $sessionId && student._ref == $studentId][0]`,
        { sessionId, studentId: student._id }
    );

    if (existing) {
        return NextResponse.json({
            ok: true,
            message: "Attendance already marked",
            attendanceId: existing._id,
            studentName: student.user?.name || `${student.firstName} ${student.lastName}`
        });
    }

    // 5. Determine if late (use dynamic grace period from settings)
    const systemSettings = await sanityClient.fetch(`*[_type == "systemConfig"][0]{gracePeriodMinutes}`);
    const gracePeriod = systemSettings?.gracePeriodMinutes ?? 15;

    const sessionStart = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = (now.getTime() - sessionStart.getTime()) / (1000 * 60);
    const status = diffMinutes > gracePeriod ? "late" : "present";

    const attendance = await sanityClient.create({
        _type: "attendance",
        session: { _type: "reference", _ref: sessionId },
        student: { _type: "reference", _ref: student._id },
        timestamp: now.toISOString(),
        status,
        timeIn: now.toISOString(),
        markedBy: "device",
    });

    // Notify student
    try {
        await sanityClient.create({
            _type: "notification",
            recipient: { _type: "reference", _ref: student._id },
            type: `attendance_${status}`,
            title: `Attendance: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your device scan was successful. You are marked as ${status} in your class.`,
            isRead: false,
            createdAt: now.toISOString(),
        });
    } catch (notifErr) {
        console.error("Failed to create device attendance notification:", notifErr);
    }

    // Update device lastSeen
    await sanityClient.patch(device._id).set({ lastSeen: now.toISOString() }).commit();

    return NextResponse.json({
        ok: true,
        attendanceId: attendance._id,
        studentName: student.user?.name || `${student.firstName} ${student.lastName}`,
        status,
        enrolled: enrollmentOccurred,
        message: enrollmentOccurred ? "Enrolled and marked present" : "Attendance marked"
    });
}
