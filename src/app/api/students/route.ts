export const dynamic = "force-dynamic";
// ============================================================
// /api/students — CRUD operations for students
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllStudents } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin", "professor"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studyField = searchParams.get("studyField") || user?.studyField || "";
    const level = searchParams.get("level") || "all";
    const specialty = searchParams.get("specialty") || "all";
    const group = searchParams.get("group") || "all";

    // Resolve Study Field ID if it's a code
    let resolvedId = "";
    if (studyField && studyField !== "all") {
        const result = await sanityClient.fetch(
            `*[_type == "studyField" && (code == $code || _id == $code)][0]._id`,
            { code: studyField }
        );
        resolvedId = result || "";
    }

    const params = {
        studyField: studyField === "all" ? "" : studyField,
        studyFieldId: resolvedId || (studyField === "all" ? "" : studyField),
        level,
        specialty,
        group
    };

    console.log("API Students: Fetching with params:", params);
    const students = await sanityClient.fetch(getAllStudents, params);
    return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, matricule, dateOfBirth, studyField, specialty, degree, level, group, academicYear } = body;
    const fullName = `${firstName} ${lastName}`;

    // Use dateOfBirth (DDMMYYYY) as default password
    const hashedPassword = await bcrypt.hash(dateOfBirth, 10);

    // Create user account
    const userDoc = await sanityClient.create({
        _type: "user",
        name: fullName,
        username: matricule, // username is matricule
        password: hashedPassword,
        role: "student",
    });

    // Create student document
    const studentDoc = await sanityClient.create({
        _type: "student",
        user: { _type: "reference", _ref: userDoc._id },
        matricule,
        firstName,
        lastName,
        dateOfBirth,
        studyField: user?.studyField || studyField || null,
        specialty: specialty || null,
        degree: degree || "Licence",
        level: level || "L1",
        group: group || "G1",
        academicYear: academicYear || new Date().getFullYear().toString(),
        rfidUid: matricule, // rfidUid is matricule
        fingerprintId: null,
    });

    // Link student back to user for bidirectional query
    await sanityClient.patch(userDoc._id).set({ student: { _type: "reference", _ref: studentDoc._id } }).commit();

    return NextResponse.json({ student: studentDoc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { _id, firstName, lastName, matricule, dateOfBirth, studyField, specialty, degree, level, group, academicYear } = body;
    const fullName = `${firstName} ${lastName}`;

    // Safety check: ensure admin can only edit students in their scope
    const existingStudent = await sanityClient.fetch(`*[_type == "student" && _id == $id][0]`, { id: _id });

    const userField = user?.studyField?.trim().toLowerCase();
    const studentField = existingStudent?.studyField?.trim().toLowerCase();

    // Lenient matching: e.g., "info" should match "informatique"
    const isOutOfScope = user?.role === "admin" && userField && studentField &&
        !(studentField === userField || (userField.length >= 3 && studentField.startsWith(userField)) || (studentField.length >= 3 && userField.startsWith(studentField)));

    if (isOutOfScope) {
        return NextResponse.json({
            message: `Forbidden: Out of scope. Student field (${studentField}) != Your field (${userField})`
        }, { status: 403 });
    }

    // Update student doc
    const updated = await sanityClient.patch(_id).set({
        matricule,
        firstName,
        lastName,
        dateOfBirth,
        studyField: user?.studyField || studyField || existingStudent?.studyField || null,
        specialty: specialty || null,
        degree,
        level,
        group,
        academicYear,
        rfidUid: matricule // Ensure rfidUid stays synced with matricule
    }).commit();

    // Update associated user
    const studentWithUser = await sanityClient.fetch(`*[_type == "student" && _id == $id][0]{ user->{ _id } }`, { id: _id });
    if (studentWithUser?.user?._id) {
        await sanityClient.patch(studentWithUser.user._id).set({
            name: fullName,
            username: matricule
        }).commit();
    }

    return NextResponse.json({ student: updated });
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

        // Get the user ref before deleting
        const existing = await sanityClient.fetch(`*[_type == "student" && _id == $id][0]{ user, studyField }`, { id });

        const userField = user?.studyField?.trim().toLowerCase();
        const existingField = existing?.studyField?.trim().toLowerCase();

        // Safety check: ensure admin can only delete students in their scope (lenient matching)
        const isOutOfScope = user?.role === "admin" && userField && existingField &&
            !(existingField === userField || (userField.length >= 3 && existingField.startsWith(userField)) || (existingField.length >= 3 && userField.startsWith(existingField)));

        if (isOutOfScope) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }

        // Delete student document
        await sanityClient.delete(id);

        // Delete associated user account
        if (existing?.user?._ref) {
            await sanityClient.delete(existing.user._ref);
        }

        return NextResponse.json({ message: "Student deleted" });
    } catch (error: any) {
        console.error("DELETE Student Error:", error);

        // Check for reference constraint errors from Sanity
        if (error.message?.includes("reference")) {
            return NextResponse.json(
                { message: "Cannot delete this student because they are referenced in attendance records. Delete those records first." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: error.message || "Failed to delete student" },
            { status: 500 }
        );
    }
}
