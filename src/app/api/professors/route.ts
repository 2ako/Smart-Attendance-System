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
    
    const userField = user?.studyField?.trim().toLowerCase();
    const profField = existingProf?.department?.trim().toLowerCase();
    const isSuperAdmin = !userField || userField === "all" || userField === "common";

    if (user?.role === "admin" && !isSuperAdmin && profField && userField && 
        !(profField === userField || (userField.length >= 3 && profField.startsWith(userField)) || (profField.length >= 3 && userField.startsWith(profField)))) {
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
        const userField = user?.studyField?.trim().toLowerCase();
        const profField = existing?.department?.trim().toLowerCase();
        const isSuperAdmin = !userField || userField === "all" || userField === "common";

        if (user?.role === "admin" && !isSuperAdmin && profField && userField && 
            !(profField === userField || (userField.length >= 3 && profField.startsWith(userField)) || (profField.length >= 3 && userField.startsWith(profField)))) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }

        console.log(`[API] Deleting professor ${id} and cleaning up dependencies...`);

        // 1. Cascade Delete: Schedules associated with this professor
        const schedules = await sanityClient.fetch(`*[_type == "schedule" && professor._ref == $id]._id`, { id });
        if (schedules.length > 0) {
            console.log(`[API] Deleting ${schedules.length} orphan schedules...`);
            await Promise.all(schedules.map((sid: string) => sanityClient.delete(sid)));
        }

        // 2. Cascade Delete: Sessions associated with this professor
        const sessions = await sanityClient.fetch(`*[_type == "session" && professor._ref == $id]._id`, { id });
        if (sessions.length > 0) {
            console.log(`[API] Deleting ${sessions.length} sessions...`);
            await Promise.all(sessions.map((sid: string) => sanityClient.delete(sid)));
        }

        // 3. Nullify Subject References: Any subject pointing to this professor
        const subjects = await sanityClient.fetch(`*[_type == "subject" && professor._ref == $id]._id`, { id });
        if (subjects.length > 0) {
            console.log(`[API] Nullifying professor reference in ${subjects.length} subjects...`);
            await Promise.all(subjects.map((sid: string) => 
                sanityClient.patch(sid).unset(["professor"]).commit()
            ));
        }

        // 4. Cleanup Make-up Requests: Any request pointing to this professor
        const makeups = await sanityClient.fetch(`*[_type == "makeUpRequest" && professor._ref == $id]._id`, { id });
        if (makeups.length > 0) {
            console.log(`[API] Deleting ${makeups.length} makeup requests...`);
            await Promise.all(makeups.map((mid: string) => sanityClient.delete(mid)));
        }

        // 5. Delete professor document
        await sanityClient.delete(id);

        // 4. Delete associated user account
        if (existing?.user?._ref) {
            await sanityClient.delete(existing.user._ref);
        }

        return NextResponse.json({ message: "Professor and all associated data deleted successfully" });
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
