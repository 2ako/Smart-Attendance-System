// ============================================================
// /api/student/justifications — CRUD operations for Absence Justifications
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getStudentByUserId, getJustificationsByStudent } from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });
        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        const justifications = await sanityClient.fetch(getJustificationsByStudent, { studentId: student._id });
        return NextResponse.json({ justifications });
    } catch (error: any) {
        console.error("Error fetching justifications:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });
        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const file = formData.get("file") as File;
        const attendanceIds = formData.get("attendanceIds") ? JSON.parse(formData.get("attendanceIds") as string) : [];
        const justifiedDates = formData.get("justifiedDates") ? JSON.parse(formData.get("justifiedDates") as string) : [];

        if (!title || !file) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // 1. Upload file to Sanity
        const fileArrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(fileArrayBuffer);

        const asset = await sanityClient.assets.upload("file", fileBuffer, {
            filename: file.name,
            contentType: file.type
        });

        // 2. Create Justification document
        const justification = {
            _type: "justification",
            student: {
                _type: "reference",
                _ref: student._id
            },
            title,
            description,
            file: {
                _type: "file",
                asset: {
                    _type: "reference",
                    _ref: asset._id
                }
            },
            attendanceRecords: attendanceIds.map((id: string) => ({
                _type: "reference",
                _ref: id,
                _key: Math.random().toString(36).substring(2)
            })),
            justifiedDates,
            status: "pending",
            submissionDate: new Date().toISOString()
        };

        const created = await sanityClient.create(justification);

        // Notify the faculty admin of this student's department
        try {
            if (student.studyField) {
                // Find faculty admin for this field
                const facultyAdmin = await sanityClient.fetch(
                    `*[_type == "user" && role == "admin" && studyField == $studyField][0]`,
                    { studyField: student.studyField }
                );

                if (facultyAdmin) {
                    await sanityClient.create({
                        _type: "notification",
                        recipient: { _type: "reference", _ref: facultyAdmin._id },
                        type: "new_justification",
                        title: "New Absence Justification",
                        message: `${user.name || 'A student'} has submitted an absence justification for review.`,
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                }
            }
        } catch (notifyError) {
            console.error("Failed to notify faculty admin:", notifyError);
        }

        return NextResponse.json({ justification: created }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating justification:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
