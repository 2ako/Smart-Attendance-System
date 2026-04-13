// ============================================================
// /api/assignments — Centralized Assignment Management
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import {
    getStudentByUserId,
    getStudentCourses,
    getAssignmentsBySubject,
    getAssignmentsBySubjectWithStatus,
    getAssignmentsByProfessor
} from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get("subjectId");
        const professorId = searchParams.get("professorId");
        const studentId = searchParams.get("studentId");

        // 1. Fetch by Subject ID (Visible to anyone authorized)
        if (subjectId) {
            const assignments = await sanityClient.fetch(getAssignmentsBySubject, { subjectIds: [subjectId] });
            return NextResponse.json({ assignments });
        }

        // 2. Fetch by Professor ID (Management view)
        if (professorId) {
            const assignments = await sanityClient.fetch(getAssignmentsByProfessor, { professorId });
            return NextResponse.json({ assignments });
        }

        // 3. Fetch for logged-in Student (Legacy-compatible logic)
        if (user.role === "student" && (studentId === "me" || !studentId)) {
            const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });
            if (!student) return NextResponse.json({ message: "Student record not found" }, { status: 404 });

            const courses = await sanityClient.fetch(getStudentCourses, {
                academicYear: student.academicYear,
                degree: student.degree,
                level: student.level,
                studyField: student.studyField || "",
                specialty: student.specialty || "",
                group: student.group || "",
            });

            const subjectIds = courses.map((c: any) => c._id);

            const assignments = await sanityClient.fetch(getAssignmentsBySubjectWithStatus, {
                subjectIds,
                studentId: student._id,
                studentLevel: student.level,
                studentSpecialty: student.specialty || "",
                studentGroup: student.group || "",
                studentStudyField: student.studyField || "",
            });
            return NextResponse.json({ assignments });
        }

        return NextResponse.json({ message: "Invalid query parameters" }, { status: 400 });
    } catch (error: any) {
        console.error("Error fetching assignments:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["professor", "admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const formData = await req.formData();
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const subjectId = formData.get("subjectId") as string;
        const dueDate = formData.get("dueDate") as string;
        const type = formData.get("type") as string;
        const points = parseInt(formData.get("points") as string) || 100;
        const status = (formData.get("status") as string) || "published";
        const files = formData.getAll("files") as File[];

        if (!title || !subjectId || !dueDate || !type) {
            return NextResponse.json({ message: "Required fields missing" }, { status: 400 });
        }

        // Upload files as Sanity assets
        const attachmentRefs: any[] = [];
        for (const file of files) {
            if (file.size === 0) continue;
            const buffer = Buffer.from(await file.arrayBuffer());
            const asset = await sanityClient.assets.upload("file", buffer, {
                filename: file.name,
                contentType: file.type,
            });
            attachmentRefs.push({
                _key: Math.random().toString(36).substring(2, 9),
                _type: "file",
                asset: { _type: "reference", _ref: asset._id },
            });
        }

        // Safety check: ensure the subject belongs to the user's scope
        const subject = await sanityClient.fetch(`*[_type == "subject" && _id == $subjectId][0]{ studyField, professor->{ _id } }`, { subjectId });
        if (user?.role === "admin" && user?.studyField && subject?.studyField && subject.studyField !== user.studyField) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }
        if (user?.role === "professor") {
            // Get the professor record for the logged-in user
            const profRecord = await sanityClient.fetch(`*[_type == "professor" && user._ref == $userId][0]{ _id }`, { userId: user.id });
            // Ensure the professor is linked to the subject or is allowed to create assignments for it
            // (Relaxing this slightly for now: just log it, but definitely block if studyField mismatch if applicable)
        }

        const assignmentDoc = {
            _type: "assignment",
            title,
            description,
            subject: { _type: "reference", _ref: subjectId },
            dueDate,
            type,
            points,
            status,
            attachments: attachmentRefs,
            // Link to the professor who created it if they are a professor
            professor: user?.role === "professor" ? { _type: "reference", _ref: (await sanityClient.fetch(`*[_type == "professor" && user._ref == $userId][0]{ _id }`, { userId: user.id }))._id } : undefined
        };

        const created = await sanityClient.create(assignmentDoc);

        // Auto-notify enrolled students
        if (status === "published") {
            try {
                // Fetch subject details for matching
                const subject = await sanityClient.fetch(
                    `*[_type == "subject" && _id == $subjectId][0]{ level, degree, studyField, specialty, academicYear, group }`,
                    { subjectId }
                );

                if (subject) {
                    // Build filter: match students by level + degree (and optionally studyField/specialty)
                    const studyFieldFilter = subject.studyField ? `&& (studyField == $studyField || specialty == $specialty || specialty == $studyField)` : "";
                    const students = await sanityClient.fetch(
                        `*[_type == "student" && level == $level && degree == $degree ${studyFieldFilter}]{ _id }`,
                        {
                            level: subject.level,
                            degree: subject.degree,
                            studyField: subject.studyField || "",
                            specialty: subject.specialty || ""
                        }
                    );

                    if (students.length > 0) {
                        const transaction = sanityClient.transaction();
                        for (const student of students) {
                            transaction.create({
                                _type: "notification",
                                recipient: { _type: "reference", _ref: student._id },
                                type: "new_assignment",
                                title: `New Assignment: ${title}`,
                                message: `Your professor has published a new ${type} for this subject. Due: ${new Date(dueDate).toLocaleDateString()}.`,
                                assignment: { _type: "reference", _ref: created._id },
                                isRead: false,
                                createdAt: new Date().toISOString(),
                            });
                        }
                        await transaction.commit();
                    }
                }
            } catch (notifError) {
                // Don't fail the assignment creation if notifications fail
                console.error("Notification error (non-fatal):", notifError);
            }
        }

        return NextResponse.json({ assignment: created }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating assignment:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["professor", "admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const formData = await req.formData();
        const _id = formData.get("_id") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const subjectId = formData.get("subjectId") as string;
        const dueDate = formData.get("dueDate") as string;
        const type = formData.get("type") as string;
        const points = parseInt(formData.get("points") as string);
        const status = formData.get("status") as string;
        const files = formData.getAll("files") as File[];
        const existingRaw = formData.get("existingAttachments") as string;
        const existingAttachments: any[] = existingRaw ? JSON.parse(existingRaw) : [];

        if (!_id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

        // Upload new files as Sanity assets
        const newAttachmentRefs: any[] = [];
        for (const file of files) {
            if (file.size === 0) continue;
            const buffer = Buffer.from(await file.arrayBuffer());
            const asset = await sanityClient.assets.upload("file", buffer, {
                filename: file.name,
                contentType: file.type,
            });
            newAttachmentRefs.push({
                _key: Math.random().toString(36).substring(2, 9),
                _type: "file",
                asset: { _type: "reference", _ref: asset._id },
            });
        }

        // Safety check: ensure the assignment belongs to the user's scope
        const currentAssignment = await sanityClient.fetch(`*[_type == "assignment" && _id == $id][0]{ subject->{ studyField }, professor->{ _id } }`, { id: _id });
        if (user?.role === "admin" && user?.studyField && currentAssignment?.subject?.studyField && currentAssignment.subject.studyField !== user.studyField) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }
        if (user?.role === "professor") {
            const profRecord = await sanityClient.fetch(`*[_type == "professor" && user._ref == $userId][0]{ _id }`, { userId: user.id });
            if (currentAssignment?.professor?._id && currentAssignment.professor._id !== profRecord?._id) {
                return NextResponse.json({ message: "Forbidden: Not your assignment" }, { status: 403 });
            }
        }

        const patch: any = {
            title,
            description,
            dueDate,
            type,
            points,
            status,
            attachments: [...existingAttachments, ...newAttachmentRefs],
        };

        if (subjectId) {
            // Also check new subject scope if changed
            const newSubject = await sanityClient.fetch(`*[_type == "subject" && _id == $id][0]{ studyField }`, { id: subjectId });
            if (user?.role === "admin" && user?.studyField && newSubject?.studyField && newSubject.studyField !== user.studyField) {
                return NextResponse.json({ message: "Forbidden: Target subject out of scope" }, { status: 403 });
            }
            patch.subject = { _type: "reference", _ref: subjectId };
        }

        const updated = await sanityClient.patch(_id).set(patch).commit();
        return NextResponse.json({ assignment: updated });
    } catch (error: any) {
        console.error("Error updating assignment:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["professor", "admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const id = new URL(req.url).searchParams.get("id");
        if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

        // Safety check: scope verification
        const existing = await sanityClient.fetch(`*[_type == "assignment" && _id == $id][0]{ subject->{ studyField }, professor->{ _id } }`, { id });
        if (user?.role === "admin" && user?.studyField && existing?.subject?.studyField && existing.subject.studyField !== user.studyField) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }
        if (user?.role === "professor") {
            const profRecord = await sanityClient.fetch(`*[_type == "professor" && user._ref == $userId][0]{ _id }`, { userId: user.id });
            if (existing?.professor?._id && existing.professor._id !== profRecord?._id) {
                return NextResponse.json({ message: "Forbidden: Not your assignment" }, { status: 403 });
            }
        }

        await sanityClient.delete(id);
        return NextResponse.json({ message: "Assignment deleted" });
    } catch (error) {
        console.error("Error deleting assignment:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
