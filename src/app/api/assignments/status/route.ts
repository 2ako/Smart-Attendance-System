import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getSubmissionStatus, getStudentByUserId } from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const assignmentId = searchParams.get("assignmentId");

        if (!assignmentId) {
            return NextResponse.json({ message: "Assignment ID is required" }, { status: 400 });
        }

        const student = await sanityClient.fetch(getStudentByUserId, {
            userId: (user as any).id || (user as any).id
        });

        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        const status = await sanityClient.fetch(getSubmissionStatus, {
            assignmentId,
            studentId: student._id
        });

        return NextResponse.json({ status });
    } catch (error: any) {
        console.error("Error fetching submission status:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
