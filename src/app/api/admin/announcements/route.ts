import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const adminDoc = await sanityClient.fetch(`*[_type == "user" && _id == $id][0]{ studyField }`, { id: user.id });
        const adminStudyField = adminDoc?.studyField || null;

        let query = `*[_type == "assignment" && type == "affichage"`;
        const params: any = {};

        if (adminStudyField) {
            // Find the ID of the studyField document to check references
            const sfArray = await sanityClient.fetch(`*[_type == "studyField" && code == $code]{ _id }`, { code: adminStudyField });
            const adminStudyFieldId = sfArray[0]?._id;

            params.field = adminStudyField;
            if (adminStudyFieldId) {
                params.fieldId = adminStudyFieldId;
                // Check if specialized to this field, or a faculty admin announcement targeting this field (either specifically or all)
                query += ` && (studyField == $field || (targetAudience == "faculty_admins" && (!defined(targetFaculties) || count(targetFaculties[@._ref == $fieldId]) > 0 || targetFaculty._ref == $fieldId)))`;
            } else {
                query += ` && studyField == $field`;
            }
        } else {
            // Super Admin should only see their own announcements (!defined(studyField))
            query += ` && !defined(studyField)`;
        }

        query += `] | order(_createdAt desc) {
            _id,
            title,
            description,
            dueDate,
            status,
            level,
            specialty,
            studyField,
            group,
            targetAudience,
            "targetFaculty": targetFaculty->{ _id, name },
            "targetFaculties": targetFaculties[]->{ _id, name },
            _createdAt,
            "subject": subject->{ _id, name, code, level, specialty, degree },
            "attachments": attachments[]{ _key, "url": asset->url, "originalFilename": asset->originalFilename }
        }`;

        const announcements = await sanityClient.fetch(query, params);

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error("Error fetching admin announcements:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const adminDoc = await sanityClient.fetch(`*[_type == "user" && _id == $id][0]{ studyField }`, { id: user.id });
        const adminStudyField = adminDoc?.studyField || null;

        const formData = await req.formData();
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const status = formData.get("status") as string || "published";
        const targetType = formData.get("targetType") as string || "global";
        const targetAudience = formData.get("targetAudience") as string || "students";
        const targetFacultyIdsRaw = formData.get("targetFacultyIds") as string;
        const targetFacultyIds = targetFacultyIdsRaw ? JSON.parse(targetFacultyIdsRaw) : [];
        const level = formData.get("level") as string;
        const specialty = formData.get("specialty") as string;
        const group = formData.get("group") as string;
        const targetStudentsRaw = formData.get("targetStudents") as string;
        const targetStudentIds = targetStudentsRaw ? JSON.parse(targetStudentsRaw) : [];

        if (!title) {
            return NextResponse.json({ message: "Title is required" }, { status: 400 });
        }

        // Upload files
        const files = formData.getAll("files") as File[];
        const attachmentRefs = [];
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

        const assignmentDoc: any = {
            _type: "assignment",
            title,
            description,
            type: "affichage",
            points: 0,
            status,
            dueDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // 1 year from now
            attachments: attachmentRefs.length > 0 ? attachmentRefs : undefined,
            studyField: adminStudyField,
            targetAudience,
            targetType,
        };

        if (targetAudience === "faculty_admins") {
            if (targetFacultyIds && targetFacultyIds.length > 0) {
                assignmentDoc.targetFaculties = targetFacultyIds.map((id: string) => ({
                    _key: Math.random().toString(36).substring(2, 9),
                    _type: "reference",
                    _ref: id
                }));
            }
        } else {
            if (targetType === "cohort") {
                assignmentDoc.level = level;
                assignmentDoc.specialty = specialty || null;
                if (group) {
                    assignmentDoc.group = group;
                }
            } else if (targetType === "individual") {
                assignmentDoc.targetStudents = targetStudentIds.map((id: string) => ({
                    _key: Math.random().toString(36).substring(2, 9),
                    _type: "reference",
                    _ref: id
                }));
            }
        }

        const created = await sanityClient.create(assignmentDoc);

        // Notify targets
        if (status === "published") {
            try {
                let targetsToNotify: { _id: string, _type: string }[] = [];

                if (targetAudience === "faculty_admins") {
                    let query = `*[_type == "user" && role == "admin"`;
                    const params: any = {};

                    if (targetFacultyIds && targetFacultyIds.length > 0) {
                        // Notify targeted Faculty Admins
                        const targetFieldObjs = await sanityClient.fetch(`*[_type == "studyField" && _id in $sfIds]{ _id, code }`, { sfIds: targetFacultyIds });
                        const targetCodes = targetFieldObjs.map((f: any) => f.code);

                        query += ` && studyField in $targetCodes`;
                        params.targetCodes = targetCodes;
                    } else {
                        // All Faculty Admins (those with a studyField)
                        query += ` && defined(studyField)`;
                    }
                    query += `]{ _id }`;

                    const admins = await sanityClient.fetch(query, params);
                    targetsToNotify = admins.map((a: any) => ({ _id: a._id, _type: "user" }));
                } else {
                    // Notify Students (Original Logic)
                    if (targetType === "cohort") {
                        const specialtyVal = (specialty || "").trim();
                        let query = `*[_type == "student" && level == $level`;
                        const params: any = { level };

                        if (specialtyVal) {
                            query += ` && (specialty == $specialty || studyField == $specialty)`;
                            params.specialty = specialtyVal;
                        }

                        if (group) {
                            query += ` && group == $group`;
                            params.group = group;
                        }
                        query += `]{ _id }`;

                        const students = await sanityClient.fetch(query, params);
                        targetsToNotify = students.map((s: any) => ({ _id: s._id, _type: "student" }));
                    } else if (targetType === "individual") {
                        targetsToNotify = targetStudentIds.map((id: string) => ({ _id: id, _type: "student" }));
                    } else {
                        const students = await sanityClient.fetch(`*[_type == "student"]{ _id }`);
                        targetsToNotify = students.map((s: any) => ({ _id: s._id, _type: "student" }));
                    }
                }

                if (targetsToNotify.length > 0) {
                    const transaction = sanityClient.transaction();
                    for (const target of targetsToNotify) {
                        transaction.create({
                            _type: "notification",
                            // Use appropriate reference based on target type
                            recipient: { _type: "reference", _ref: target._id },
                            type: "new_announcement",
                            title: `New Announcement: ${title}`,
                            message: `The administration has published a new announcement.`,
                            assignment: { _type: "reference", _ref: created._id },
                            isRead: false,
                            createdAt: new Date().toISOString(),
                        });
                    }
                    await transaction.commit();
                }
            } catch (notifError) {
                console.error("Announcement notification error:", notifError);
            }
        }

        return NextResponse.json({ announcement: created }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating announcement:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const formData = await req.formData();
        const _id = formData.get("_id") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const status = formData.get("status") as string || "published";
        const targetFacultyIdsRaw = formData.get("targetFacultyIds") as string;
        const targetFacultyIds = targetFacultyIdsRaw ? JSON.parse(targetFacultyIdsRaw) : [];
        const level = formData.get("level") as string;
        const specialty = formData.get("specialty") as string;
        const group = formData.get("group") as string;
        const targetStudentsRaw = formData.get("targetStudents") as string;
        const targetType = formData.get("targetType") as string || "global";
        const targetAudience = formData.get("targetAudience") as string || "students";
        const targetStudentIds = targetStudentsRaw ? JSON.parse(targetStudentsRaw) : [];

        if (!_id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

        // Upload files (if any new ones)
        const files = formData.getAll("files") as File[];
        const newAttachmentRefs = [];
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

        const patch: any = {
            title,
            description,
            status,
        };

        if (newAttachmentRefs.length > 0) {
            patch.attachments = newAttachmentRefs;
        }

        patch.targetType = targetType;
        patch.targetAudience = targetAudience;

        if (targetType === "global") {
            patch.level = null;
            patch.specialty = null;
            patch.group = null;
            patch.targetStudents = null;
            patch.subject = null;
        } else if (targetType === "cohort") {
            patch.level = level;
            patch.specialty = specialty || null;
            patch.group = group || null;
            patch.targetStudents = null;
            patch.subject = null;
        } else if (targetType === "individual") {
            patch.level = null;
            patch.specialty = null;
            patch.group = null;
            patch.targetStudents = targetStudentIds.map((id: string) => ({
                _key: Math.random().toString(36).substring(2, 9),
                _type: "reference",
                _ref: id
            }));
            patch.subject = null;
        }

        if (targetFacultyIds && targetFacultyIds.length > 0) {
            patch.targetFaculties = targetFacultyIds.map((id: string) => ({
                _key: Math.random().toString(36).substring(2, 9),
                _type: "reference",
                _ref: id
            }));
            patch.targetFaculty = null; // Clear single reference if we use multiple now
        } else {
            patch.targetFaculties = null;
        }

        const updated = await sanityClient.patch(_id).set(patch).commit();
        return NextResponse.json({ announcement: updated });
    } catch (error: any) {
        console.error("Error updating announcement:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ message: "ID parameter missing" }, { status: 400 });

        await sanityClient.delete(id);

        return NextResponse.json({ message: "Announcement deleted successfully" });
    } catch (error) {
        console.error("Error deleting announcement:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
