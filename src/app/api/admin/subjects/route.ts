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
        if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

        const sfCode = user?.studyField || "";

        // Resolve Study Field ID if it's a code
        let resolvedId = "";
        if (sfCode && sfCode !== "all") {
            const result = await sanityClient.fetch(
                `*[_type == "studyField" && (code == $code || _id == $code || name == $code || title == $code)][0]._id`,
                { code: sfCode }
            );
            resolvedId = result || "";
        }

        const params = {
            studyField: sfCode === "all" ? "" : sfCode,
            studyFieldId: resolvedId || (sfCode === "all" ? "" : sfCode)
        };

        const subjects = await sanityClient.fetch(getAllSubjects, params);
        return NextResponse.json({ subjects });
    } catch (error: any) {
        console.error("Error fetching admin subjects:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { professorId, ...rest } = body;

    const dataToSave = {
        ...rest,
        studyField: user?.studyField || body.studyField || null
    };

    if (professorId) {
        dataToSave.professor = { _type: "reference", _ref: professorId };
    }

    const doc = await sanityClient.create({
        _id: body._id || `subject-${Math.random().toString(36).substr(2, 9)}`,
        _type: "subject",
        ...dataToSave
    });
    return NextResponse.json({ subject: doc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { _id, professorId, ...data } = await req.json();
    const existing = await sanityClient.fetch(`*[_type == "subject" && _id == $id][0]`, { id: _id });

    const existingSf = typeof existing?.studyField === "object" ? (existing.studyField._ref || existing.studyField._id) : existing?.studyField;

    // Safety check: ensure admin can only edit subjects in their scope
    if (user?.role === "admin" && user?.studyField !== "all" && existingSf && existingSf !== "all" && existingSf !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    const updateData: any = {
        ...data,
        studyField: user?.studyField || data.studyField || existing?.studyField
    };

    if (professorId) {
        updateData.professor = { _type: "reference", _ref: professorId };
    }

    const updated = await sanityClient.patch(_id).set(updateData).commit();
    return NextResponse.json({ subject: updated });
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const existing = await sanityClient.fetch(`*[_type == "subject" && _id == $id][0]{ studyField }`, { id });
    const existingSf = typeof existing?.studyField === "object" ? (existing.studyField._ref || existing.studyField._id) : existing?.studyField;

    if (user?.role === "admin" && user?.studyField !== "all" && existingSf && existingSf !== "all" && existingSf !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    await sanityClient.delete(id);
    return NextResponse.json({ message: "Subject deleted" });
}

export async function PATCH(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const sfCode = user?.studyField || "";
    
    // Wipe scheduleInfo for all subjects in scope
    let query = `*[_type == "subject"]`;
    if (sfCode && sfCode !== "all") {
        query = `*[_type == "subject" && studyField == $sf || (studyField._ref == $sf)]`;
    }

    const subjects = await sanityClient.fetch(query, { sf: sfCode });
    
    const transaction = sanityClient.transaction();
    subjects.forEach((s: any) => {
        transaction.patch(s._id, p => p.unset(['scheduleInfo']));
    });
    
    await transaction.commit();
    
    return NextResponse.json({ message: "All schedules reset" });
}
