export const dynamic = "force-dynamic";
// ============================================================
// /api/schedules — CRUD operations for schedules
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllSchedules } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const schedules = await sanityClient.fetch(getAllSchedules, { studyField: user?.studyField || "" });
    return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();

    // Safety check: ensure the subject belongs to the admin's scope
    const subject = await sanityClient.fetch(`*[_type == "subject" && _id == $id][0]{ studyField }`, { id: body.subjectId });
    if (user?.role === "admin" && user?.studyField && subject?.studyField && subject.studyField !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    const doc = await sanityClient.create({
        _type: "schedule",
        subject: { _type: "reference", _ref: body.subjectId },
        professor: { _type: "reference", _ref: body.professorId },
        room: { _type: "reference", _ref: body.roomId || body.room?._ref },
        day: body.day,
        startTime: body.startTime,
        endTime: body.endTime,
        group: body.group,
    });
    return NextResponse.json({ schedule: doc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { _id, ...data } = await req.json();

    // Safety check: ensure the schedule's subject belongs to the admin's scope
    const existing = await sanityClient.fetch(`*[_type == "schedule" && _id == $id][0]{ subject->{ studyField } }`, { id: _id });
    if (user?.role === "admin" && user?.studyField && existing?.subject?.studyField && existing.subject.studyField !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    const patch: any = { day: data.day, startTime: data.startTime, endTime: data.endTime, group: data.group };
    if (data.subjectId) patch.subject = { _type: "reference", _ref: data.subjectId };
    if (data.professorId) patch.professor = { _type: "reference", _ref: data.professorId };
    if (data.roomId) patch.room = { _type: "reference", _ref: data.roomId };

    const updated = await sanityClient.patch(_id).set(patch).commit();
    return NextResponse.json({ schedule: updated });
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    // Safety check: ensure the schedule's subject belongs to the admin's scope
    const existing = await sanityClient.fetch(`*[_type == "schedule" && _id == $id][0]{ subject->{ studyField } }`, { id });
    if (user?.role === "admin" && user?.studyField && existing?.subject?.studyField && existing.subject.studyField !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    await sanityClient.delete(id);
    return NextResponse.json({ message: "Schedule deleted" });
}
