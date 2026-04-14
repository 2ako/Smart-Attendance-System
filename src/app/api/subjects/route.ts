export const dynamic = "force-dynamic";
// ============================================================
// /api/subjects — CRUD operations for subjects
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllSubjects } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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

    console.log("API Subjects: Fetching with params:", params);
    const subjects = await sanityClient.fetch(getAllSubjects, params);
    return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const doc = await sanityClient.create({
        _type: "subject",
        ...body,
        // Force the admin's studyField if they are scoped
        studyField: user?.studyField || body.studyField || null
    });
    return NextResponse.json({ subject: doc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { _id, ...data } = await req.json();

    // Safety check: ensure admin can only edit subjects in their scope
    const existing = await sanityClient.fetch(`*[_type == "subject" && _id == $id][0]`, { id: _id });
    if (user?.role === "admin" && user?.studyField && existing?.studyField && existing.studyField !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    const updated = await sanityClient.patch(_id).set({
        ...data,
        studyField: user?.studyField || data.studyField || existing?.studyField
    }).commit();
    return NextResponse.json({ subject: updated });
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    // Safety check: ensure admin can only delete subjects in their scope
    const existing = await sanityClient.fetch(`*[_type == "subject" && _id == $id][0]{ studyField }`, { id });
    if (user?.role === "admin" && user?.studyField && existing?.studyField && existing.studyField !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    await sanityClient.delete(id);
    return NextResponse.json({ message: "Subject deleted" });
}
