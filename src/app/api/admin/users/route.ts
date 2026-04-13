// ============================================================
// GET /api/admin/users — List all users
// POST /api/admin/users — Update a user's studyField
// DELETE /api/admin/users?id=... — Delete a user
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createClient } from "@sanity/client";

const writeClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    apiVersion: "2024-01-01",
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
});

export async function GET() {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Faculty Admins only see their own faculty's users
    // Super Admins see everyone
    const adminField = user.studyField; // e.g. "INFO" or null if Super Admin

    try {
        const query = adminField 
            ? `*[_type == "user" && (studyField match $field || *[_type == "student" && user._ref == ^._id][0].studyField match $field || *[_type == "professor" && user._ref == ^._id][0].studyField match $field)] | order(name asc) { 
                _id, name, username, email, role, avatar, studyField,
                "student": *[_type == "student" && user._ref == ^._id][0]{ 
                    matricule, firstName, lastName, level, specialty, group, studyField, dateOfBirth, academicYear 
                },
                "professor": *[_type == "professor" && user._ref == ^._id][0]{ 
                    employeeId, firstName, lastName, department, studyField, specialization, rfidUid 
                }
            }`
            : `*[_type == "user"] | order(name asc) { 
                _id, name, username, email, role, avatar, studyField,
                "student": *[_type == "student" && user._ref == ^._id][0]{ 
                    matricule, firstName, lastName, level, specialty, group, studyField, dateOfBirth, academicYear 
                },
                "professor": *[_type == "professor" && user._ref == ^._id][0]{ 
                    employeeId, firstName, lastName, department, studyField, specialization, rfidUid 
                }
            }`;

        const params = adminField ? { field: adminField } : {};
        const users = await writeClient.fetch(query, params);
        
        return NextResponse.json({ users });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const { name, firstName, lastName, username, email, password, role, studyField, student, professor } = data;

        // 1. Create User Document
        const newUser = await writeClient.create({
            _type: "user",
            name,
            username,
            email,
            password, 
            role,
            studyField: studyField ? studyField.toUpperCase() : undefined,
        });

        // 2. Create Profile Document (if role is student or professor)
        if (role === "student" && student) {
            const newStudent = await writeClient.create({
                _type: "student",
                user: { _type: "reference", _ref: newUser._id },
                matricule: student.matricule || username,
                firstName: firstName || student.firstName || name?.split(" ")[0],
                lastName: lastName || student.lastName || name?.split(" ").slice(1).join(" "),
                dateOfBirth: student.dateOfBirth,
                level: student.level,
                specialty: student.specialty,
                group: student.group,
                studyField: student.studyField || studyField,
                academicYear: student.academicYear,
            });
            await writeClient.patch(newUser._id).set({ student: { _type: "reference", _ref: newStudent._id } }).commit();
        } else if (role === "professor" && professor) {
            const newProf = await writeClient.create({
                _type: "professor",
                user: { _type: "reference", _ref: newUser._id },
                employeeId: professor.employeeId || username,
                firstName: firstName || professor.firstName || name?.split(" ")[0],
                lastName: lastName || professor.lastName || name?.split(" ").slice(1).join(" "),
                department: professor.department || studyField,
                studyField: professor.studyField || studyField,
                specialization: professor.specialization,
                rfidUid: professor.rfidUid,
            });
            await writeClient.patch(newUser._id).set({ professor: { _type: "reference", _ref: newProf._id } }).commit();
        }

        return NextResponse.json({ message: "User created successfully", userId: newUser._id });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const { _id, name, firstName, lastName, username, email, password, role, studyField, student, professor } = data;

        if (!_id) return NextResponse.json({ message: "User ID is required" }, { status: 400 });

        // 1. Update User Document
        const userPatch: any = { name, username, email, role };
        if (password && password.trim() !== "") userPatch.password = password;
        if (studyField) {
            userPatch.studyField = studyField.toUpperCase();
        }

        await writeClient.patch(_id).set(userPatch).commit();

        // 2. Update/Sync Profile
        if (role === "student" && student) {
            const existing = await writeClient.fetch(`*[_type == "student" && user._ref == $uid][0]{_id}`, { uid: _id });
            if (existing) {
                await writeClient.patch(existing._id).set({
                    matricule: student.matricule,
                    firstName: firstName || student.firstName,
                    lastName: lastName || student.lastName,
                    dateOfBirth: student.dateOfBirth,
                    level: student.level,
                    specialty: student.specialty,
                    group: student.group,
                    studyField: student.studyField || studyField,
                    academicYear: student.academicYear,
                }).commit();
            } else {
                const newStudent = await writeClient.create({
                    _type: "student",
                    user: { _type: "reference", _ref: _id },
                    matricule: student.matricule || username,
                    firstName: firstName || student.firstName || name?.split(" ")[0],
                    lastName: lastName || student.lastName || name?.split(" ").slice(1).join(" "),
                    dateOfBirth: student.dateOfBirth,
                    level: student.level,
                    specialty: student.specialty,
                    group: student.group,
                    studyField: student.studyField || studyField,
                    academicYear: student.academicYear,
                });
                await writeClient.patch(_id).set({ student: { _type: "reference", _ref: newStudent._id } }).commit();
            }
        } else if (role === "professor" && professor) {
            const existing = await writeClient.fetch(`*[_type == "professor" && user._ref == $uid][0]{_id}`, { uid: _id });
            if (existing) {
                await writeClient.patch(existing._id).set({
                    employeeId: professor.employeeId,
                    firstName: firstName || professor.firstName,
                    lastName: lastName || professor.lastName,
                    department: professor.department || studyField,
                    studyField: professor.studyField || studyField,
                    specialization: professor.specialization,
                    rfidUid: professor.rfidUid,
                }).commit();
            } else {
                const newProf = await writeClient.create({
                    _type: "professor",
                    user: { _type: "reference", _ref: _id },
                    employeeId: professor.employeeId || username,
                    firstName: firstName || professor.firstName || name?.split(" ")[0],
                    lastName: lastName || professor.lastName || name?.split(" ").slice(1).join(" "),
                    department: professor.department || studyField,
                    studyField: professor.studyField || studyField,
                    specialization: professor.specialization,
                    rfidUid: professor.rfidUid,
                });
                await writeClient.patch(_id).set({ professor: { _type: "reference", _ref: newProf._id } }).commit();
            }
        }

        return NextResponse.json({ message: "User updated successfully" });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ message: "id is required" }, { status: 400 });

        const links = await writeClient.fetch(`*[references($id)]{_id, _type}`, { id });
        for (const link of links) {
            if (["student", "professor"].includes(link._type)) {
                await writeClient.delete(link._id);
            }
        }
        await writeClient.delete(id);
        return NextResponse.json({ message: "User and linked records deleted" });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
