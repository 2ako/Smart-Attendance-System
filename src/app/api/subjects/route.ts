export const dynamic = "force-dynamic";
// ============================================================
// /api/subjects — CRUD operations for subjects
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sanityClient } from "@/lib/sanity/client";
import { getAllSubjects } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET() {
    const user = await getCurrentUser();

    // Auth Check
    if (!user) {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll().map(c => c.name);
        return NextResponse.json({
            message: "Unauthorized",
            debug: {
                cookiesSeen: allCookies,
                hasAuthToken: allCookies.includes("auth-token")
            }
        }, { status: 401 });
    }

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

    return NextResponse.json({
        subjects,
        debug: {
            user: { role: user.role, studyField: user.studyField },
            sfCode: sfCode,
            resolvedId: resolvedId,
            params: params,
            count: subjects?.length || 0
        }
    });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const doc = await sanityClient.create({
        _type: "subject",
        ...body,
        studyField: user?.studyField || body.studyField || null
    });
    return NextResponse.json({ subject: doc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { _id, ...data } = await req.json();

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

    const existing = await sanityClient.fetch(`*[_type == "subject" && _id == $id][0]{ studyField }`, { id });
    if (user?.role === "admin" && user?.studyField && existing?.studyField && existing.studyField !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    await sanityClient.delete(id);
    return NextResponse.json({ message: "Subject deleted" });
}
