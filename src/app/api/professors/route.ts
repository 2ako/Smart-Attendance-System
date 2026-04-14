export const dynamic = "force-dynamic";
// ============================================================
// /api/professors — CRUD operations for professors
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllProfessors } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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

    console.log("API Professors: Fetching with params:", params);
    const professors = await sanityClient.fetch(getAllProfessors, params);
    return NextResponse.json({ professors });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, employeeId, department, specialization, rfidUid } = body;

    const hashedPassword = await bcrypt.hash(password || "default123", 10);
    const userDoc = await sanityClient.create({
        _type: "user",
        name,
        username: employeeId,
        email,
        password: hashedPassword,
        role: "professor",
    });

    const profDoc = await sanityClient.create({
        _type: "professor",
        user: { _type: "reference", _ref: userDoc._id },
        employeeId,
        department: user?.studyField || department,
        specialization: specialization || "",
        rfidUid: rfidUid || "",
    });

    return NextResponse.json({ professor: profDoc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { _id, name, email, employeeId, department, specialization, rfidUid } = body;

    // Safety check: ensure admin can only edit professors in their scope
    const existingProf = await sanityClient.fetch(`*[_type == "professor" && _id == $id][0]`, { id: _id });
    if (user?.role === "admin" && user?.studyField && existingProf?.department && existingProf.department !== user.studyField) {
        return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
    }

    const updated = await sanityClient.patch(_id).set({
        employeeId,
        department: user?.studyField || department || existingProf?.department,
        specialization,
        rfidUid
    }).commit();

    if (name || email || employeeId || body.password) {
        const prof = await sanityClient.fetch(`*[_type == "professor" && _id == $id][0]{ user->{ _id } }`, { id: _id });
        if (prof?.user?._id) {
            const patch: any = {};
            if (name) patch.name = name;
            if (email) patch.email = email;
            if (employeeId) patch.username = employeeId;
            if (body.password) patch.password = await bcrypt.hash(body.password, 10);
            await sanityClient.patch(prof.user._id).set(patch).commit();
        }
    }

    return NextResponse.json({ professor: updated });
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

        const existing = await sanityClient.fetch(`*[_type == "professor" && _id == $id][0]{ user, department }`, { id });

        // Safety check: ensure admin can only delete professors in their scope
        if (user?.role === "admin" && user?.studyField && existing?.department && existing.department !== user.studyField) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }

        // Delete professor document
        await sanityClient.delete(id);

        // Delete associated user account
        if (existing?.user?._ref) {
            await sanityClient.delete(existing.user._ref);
        }

        return NextResponse.json({ message: "Professor deleted" });
    } catch (error: any) {
        console.error("DELETE Professor Error:", error);

        // Check for reference constraint errors from Sanity
        if (error.message?.includes("reference")) {
            return NextResponse.json(
                { message: "Cannot delete this professor because they are assigned to one or more courses. Please reassign or delete their courses first." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: error.message || "Failed to delete professor" },
            { status: 500 }
        );
    }
}
