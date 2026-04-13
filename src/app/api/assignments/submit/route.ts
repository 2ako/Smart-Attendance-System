export const dynamic = "force-dynamic";
// ============================================================
// /api/assignments/submit — Student Submission Handler
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getStudentByUserId } from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

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
        const assignmentId = formData.get("assignmentId") as string;
        const content = formData.get("content") as string;
        const file = formData.get("file") as File;

        if (!assignmentId || !file) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // 1. Verify Deadline
        const assignment = await sanityClient.fetch(
            `*[_type == "assignment" && _id == $assignmentId][0]{ dueDate }`,
            { assignmentId }
        );

        if (!assignment) {
            return NextResponse.json({ message: "Assignment not found" }, { status: 404 });
        }

        const now = new Date();
        const dueDate = new Date(assignment.dueDate);
        if (now > dueDate) {
            return NextResponse.json({ message: "Submission deadline has passed" }, { status: 400 });
        }

        // 2. Upload file to Sanity
        const fileArrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(fileArrayBuffer);

        const asset = await sanityClient.assets.upload("file", fileBuffer, {
            filename: file.name,
            contentType: file.type
        });

        // 2. Create Submission document
        const submission = {
            _type: "submission",
            assignment: {
                _type: "reference",
                _ref: assignmentId
            },
            student: {
                _type: "reference",
                _ref: student._id
            },
            content,
            file: {
                _type: "file",
                asset: {
                    _type: "reference",
                    _ref: asset._id
                }
            },
            status: "submitted",
            submissionDate: new Date().toISOString()
        };

        const created = await sanityClient.create(submission);
        return NextResponse.json({ submission: created }, { status: 201 });
    } catch (error: any) {
        console.error("Error submitting assignment:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
