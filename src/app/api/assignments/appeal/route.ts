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

        const { submissionId, appealMessage } = await req.json();

        if (!submissionId || !appealMessage) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const student = await sanityClient.fetch(getStudentByUserId, {
            userId: (user as any).id || (user as any).id
        });

        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        const submission = await sanityClient.fetch(`*[_id == $submissionId && student._ref == $studentId][0]`, {
            submissionId,
            studentId: student._id
        });

        if (!submission) {
            return NextResponse.json({ message: "Submission not found" }, { status: 404 });
        }

        if (submission.status !== 'graded') {
            return NextResponse.json({ message: "Only graded assignments can be appealed" }, { status: 400 });
        }

        if (submission.appealStatus) {
            return NextResponse.json({ message: "An appeal has already been submitted for this assignment" }, { status: 400 });
        }

        // Update the submission with appeal data
        await sanityClient
            .patch(submissionId)
            .set({
                appealMessage,
                appealDate: new Date().toISOString(),
                appealStatus: 'pending'
            })
            .commit();

        return NextResponse.json({ message: "Appeal submitted successfully" });
    } catch (error: any) {
        console.error("Error submitting appeal:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
