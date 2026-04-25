export const dynamic = "force-dynamic";
// ============================================================
// /api/attendance — Attendance management
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAttendanceBySession, getAttendanceByStudent } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const studentId = searchParams.get("studentId");

    if (sessionId) {
        const attendance = await sanityClient.fetch(getAttendanceBySession, { sessionId });
        return NextResponse.json({ attendance });
    }

    if (studentId) {
        const status = searchParams.get("status");
        const isJustified = searchParams.get("isJustified");

        let targetStudentId = studentId;
        // Map userId to student._id if a student requested their own records using their user.id
        if (user && user.role === "student" && studentId === user.id) {
            const { getStudentByUserId } = await import("@/lib/sanity/queries");
            const studentDoc = await sanityClient.fetch(getStudentByUserId, { userId: user.id });
            if (studentDoc && studentDoc._id) {
                targetStudentId = studentDoc._id;
            }
        }

        let query = `*[_type == "attendance" && student._ref == $studentId`;
        if (status) query += ` && status == "${status}"`;
        if (isJustified === "true") query += ` && isJustified == true`;
        if (isJustified === "false") query += ` && (isJustified == false || !defined(isJustified))`;
        query += `]{ ..., session->{ ..., schedule->{ ..., subject->{ name, code }, room } } } | order(timestamp desc)`;

        const attendance = await sanityClient.fetch(query, { studentId: targetStudentId });
        return NextResponse.json({ attendance });
    }

    return NextResponse.json({ message: "sessionId or studentId required" }, { status: 400 });
}

// Manual attendance marking by professor
export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["professor", "admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { sessionId, studentId, status = "present" } = await req.json();

    // 1. Fetch Session and Student details for validation
    const session = await sanityClient.fetch(
        `*[_type == "session" && _id == $id][0]{
            ...,
            "subject": coalesce(
                schedule->subject->{ type, level, specialty, group, studyField },
                subject->{ type, level, specialty, group, studyField }
            )
        }`,
        { id: sessionId }
    );

    const student = await sanityClient.fetch(
        `*[_type == "student" && _id == $id][0]{
            level, specialty, group, studyField
        }`,
        { id: studentId }
    );

    if (!session || !student) {
        return NextResponse.json({ message: "Session or Student not found" }, { status: 404 });
    }

    // 2. Validation Logic
    // Helper to extract string value from potential reference or nested object
    const getString = (val: any) => {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (val.code) return val.code;
        if (val.name) return val.name;
        if (val.title) return val.title;
        return "";
    };

    const { subject } = session;
    const studentLevel = getString(student.level).trim().toUpperCase();
    const subLevel = getString(subject.level).trim().toUpperCase();
    const studentField = getString(student.studyField).trim().toLowerCase();
    const subField = getString(subject.studyField).trim().toLowerCase();
    const studentSpecialty = getString(student.specialty).trim().toLowerCase();
    const subSpecialty = getString(subject.specialty).trim().toLowerCase();
    const subType = (subject.type || "").trim().toLowerCase();

    // Level and StudyField MUST match
    const fieldMatch = studentField === subField || 
                     (studentField.length > 2 && subField.startsWith(studentField)) ||
                     (subField.length > 2 && studentField.startsWith(subField));

    if (studentLevel !== subLevel || !fieldMatch) {
        return NextResponse.json({ message: `Level/Field mismatch. Student: ${studentLevel}/${studentField}, Subject: ${subLevel}/${subField}` }, { status: 400 });
    }

    // Specialty must match if defined on subject
    if (subSpecialty && subSpecialty !== "all" && subSpecialty !== "none") {
        if (studentSpecialty !== subSpecialty) {
            return NextResponse.json({ message: `Specialty mismatch. Student: ${studentSpecialty}, Subject: ${subSpecialty}` }, { status: 400 });
        }
    }

    // Group match based on Type
    if (subType === "td" || subType === "tp") {
        const sessionGroup = getString(session?.group).trim().toUpperCase();
        const subGroup = getString(subject.group).trim().toUpperCase();
        const targetGroup = sessionGroup || subGroup;

        if (targetGroup && targetGroup !== "ALL") {
            if (student.group?.trim().toUpperCase() !== targetGroup) {
                return NextResponse.json({ message: `Student group (${student.group}) does not match session group (${targetGroup})` }, { status: 400 });
            }
        }
    }
    // If "Cours", any group in the same Level/Specialty is allowed

    const now = new Date().toISOString();
    const attendance = await sanityClient.create({
        _type: "attendance",
        session: { _type: "reference", _ref: sessionId },
        student: { _type: "reference", _ref: studentId },
        timestamp: now,
        status,
        timeIn: now,
        markedBy: "manual",
    });

    // ── Notify student (fire-and-forget) ─────────────────────────
    sanityClient.create({
        _type: "notification",
        recipient: { _type: "reference", _ref: studentId },
        type: `attendance_${status}`,
        title: `Attendance: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your professor has marked you as ${status} in your class.`,
        isRead: false,
        createdAt: now,
    }).catch((notifErr: unknown) => {
        console.error("Failed to create manual attendance notification:", notifErr);
    });

    return NextResponse.json({ attendance }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["professor", "admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });
    await sanityClient.delete(id);

    return NextResponse.json({ message: "Attendance record deleted" });
}
