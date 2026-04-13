// ============================================================
// /api/prof/submissions — Professor Submission Review API
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getSubmissionsByAssignment } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["professor", "admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const assignmentId = searchParams.get("assignmentId");

        if (!assignmentId) {
            return NextResponse.json({ message: "Assignment ID is required" }, { status: 400 });
        }

        const submissions = await sanityClient.fetch(getSubmissionsByAssignment, { assignmentId });
        return NextResponse.json({ submissions });
    } catch (error: any) {
        console.error("Error fetching submissions:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["professor", "admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { submissionId, grade, feedback, status, appealStatus } = body;

        if (!submissionId) {
            return NextResponse.json({ message: "Submission ID is required" }, { status: 400 });
        }

        const submissionInfo = await sanityClient.fetch(
            `*[_type == "submission" && _id == $id][0]{ student, assignment, status, appealStatus }`,
            { id: submissionId }
        );

        if (!submissionInfo) {
            return NextResponse.json({ message: "Submission not found" }, { status: 404 });
        }

        const patch: any = {};
        if (grade !== undefined) patch.grade = Number(grade);
        if (feedback !== undefined) patch.feedback = feedback;
        if (status !== undefined) patch.status = status;
        if (appealStatus !== undefined) patch.appealStatus = appealStatus;

        const updated = await sanityClient
            .patch(submissionId)
            .set(patch)
            .commit();

        try {
            // Grading notification
            if (status === "graded" && submissionInfo.status !== "graded") {
                await sanityClient.create({
                    _type: "notification",
                    recipient: { _type: "reference", _ref: submissionInfo.student._ref },
                    type: "graded",
                    title: "Assignment Graded",
                    message: "Your professor has graded your assignment submission.",
                    assignment: { _type: "reference", _ref: submissionInfo.assignment._ref },
                    isRead: false,
                    createdAt: new Date().toISOString(),
                });
            }

            // Appeal Notification
            if (appealStatus && appealStatus !== submissionInfo.appealStatus) {
                const appealMsg = appealStatus === "resolved" ? "Your grade appeal has been resolved." : "Your grade appeal has been rejected.";
                await sanityClient.create({
                    _type: "notification",
                    recipient: { _type: "reference", _ref: submissionInfo.student._ref },
                    type: "appeal_update",
                    title: "Grade Appeal Update",
                    message: appealMsg,
                    assignment: { _type: "reference", _ref: submissionInfo.assignment._ref },
                    isRead: false,
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (notifErr) {
            console.error("Failed to create grading/appeal notification:", notifErr);
        }

        return NextResponse.json({ submission: updated });
    } catch (error: any) {
        console.error("Error updating submission:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
