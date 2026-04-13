export const dynamic = "force-dynamic";
// ============================================================
// /api/admin/subjects — CRUD operations for courses (subjects)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllSubjects } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const subjects = await sanityClient.fetch(getAllSubjects, { studyField: user?.studyField || "" });
        return NextResponse.json({ subjects });
    } catch (error: any) {
        console.error("Error fetching admin subjects:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
        name, code, studyField, specialty, degree, level, group, academicYear, professorId,
        semester, day, startTime, endTime, roomId
    } = body;

    // Check for duplicate code
    const existing = await sanityClient.fetch(`*[_type == "subject" && code == $code][0]`, { code });
    if (existing) {
        return NextResponse.json({ message: "Course code already exists" }, { status: 400 });
    }

    // 1. Create the Subject
    const subjectId = `subject-${code.toLowerCase().replace(/\s+/g, '-')}`;
    const subjectDoc = await sanityClient.create({
        _id: subjectId,
        _type: "subject",
        name,
        code,
        studyField,
        specialty,
        degree,
        level,
        group,
        academicYear,
        semester: Number(semester),
        professor: professorId ? { _type: "reference", _ref: professorId } : undefined,
    });

    // 2. Create the Schedule
    if (roomId && day) {
        await sanityClient.create({
            _id: `schedule-${subjectId}`,
            _type: "schedule",
            subject: { _type: "reference", _ref: subjectId },
            professor: professorId ? { _type: "reference", _ref: professorId } : undefined,
            room: roomId,
            day,
            startTime,
            endTime,
            group,
        });
    }

    return NextResponse.json({ subject: subjectDoc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
        _id, name, code, studyField, specialty, degree, level, group, academicYear, professorId,
        semester, day, startTime, endTime, roomId
    } = body;

    // 1. Update Subject
    const updatedSubject = await sanityClient.patch(_id).set({
        name,
        code,
        studyField,
        specialty,
        degree,
        level,
        group,
        academicYear,
        semester: Number(semester),
        professor: professorId ? { _type: "reference", _ref: professorId } : undefined,
    }).commit();

    // 2. Update/Create Schedule
    if (roomId && day) {
        const scheduleId = `schedule-${_id}`;
        // Try to fetch existing schedule with this ID
        const existingSchedule = await sanityClient.fetch(`*[_type == "schedule" && _id == $scheduleId][0]`, { scheduleId });

        const scheduleData = {
            _type: "schedule",
            subject: { _type: "reference", _ref: _id },
            professor: professorId ? { _type: "reference", _ref: professorId } : undefined,
            room: roomId,
            day,
            startTime,
            endTime,
            group,
        };

        if (existingSchedule) {
            await sanityClient.patch(scheduleId).set(scheduleData).commit();
        } else {
            await sanityClient.create({ _id: scheduleId, ...scheduleData });
        }
    }

    return NextResponse.json({ subject: updatedSubject });
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ message: "ID required" }, { status: 400 });
        }

        // Find and delete associated schedule first
        const scheduleId = `schedule-${id}`;
        try {
            await sanityClient.delete(scheduleId);
        } catch (e) {
            // It's okay if schedule doesn't exist
            console.log("No schedule found to delete", e);
        }

        await sanityClient.delete(id);
        return NextResponse.json({ message: "Course deleted" });
    } catch (error: any) {
        console.error("DELETE Course Error:", error);

        if (error.message?.includes("reference")) {
            return NextResponse.json(
                { message: "Cannot delete this course because it has associated attendance sessions or other records." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: error.message || "Failed to delete course" },
            { status: 500 }
        );
    }
}
