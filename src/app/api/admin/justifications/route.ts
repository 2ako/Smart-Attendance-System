export const dynamic = "force-dynamic";
// ============================================================
// /api/admin/justifications — Admin operations for Absence Justifications
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAllJustifications } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const justifications = await sanityClient.fetch(getAllJustifications, { studyField: user?.studyField || "" });
        return NextResponse.json({ justifications });
    } catch (error: any) {
        console.error("Error fetching all justifications:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ message: "Missing ID or Status" }, { status: 400 });
        }

        // Safety check: ensure the justification's student belongs to the admin's scope
        const existing = await sanityClient.fetch(`*[_type == "justification" && _id == $id][0]{ student->{ studyField } }`, { id });
        if (user?.role === "admin" && user?.studyField && existing?.student?.studyField && existing.student.studyField !== user.studyField) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }

        if (!["pending", "approved", "rejected"].includes(status)) {
            return NextResponse.json({ message: "Invalid status" }, { status: 400 });
        }

        const updated = await sanityClient
            .patch(id)
            .set({ status })
            .commit();

        // If status is changed, notify the student
        try {
            const justification = await sanityClient.fetch(`*[_type == "justification" && _id == $id][0]{
                title,
                student->{ _id },
                attendanceRecords[]->{ _id },
                justifiedDates
            }`, { id });

            if (justification?.student?._id) {
                const notifType = status === "approved" ? "justification_approved" : "justification_rejected";
                const notifTitle = status === "approved" ? "Justification Approved" : "Justification Rejected";
                const notifMsg = status === "approved"
                    ? `Your justification "${justification.title}" has been approved. The linked absences have been adjusted.`
                    : `Your justification "${justification.title}" was rejected by the administration.`;

                // 1. Create Notification
                await sanityClient.create({
                    _type: "notification",
                    recipient: { _type: "reference", _ref: justification.student._id },
                    type: notifType,
                    title: notifTitle,
                    message: notifMsg,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });

                // 2. If approved, mark linked attendances and all absences on justifiedDates as justified
                if (status === "approved") {
                    const transaction = sanityClient.transaction();

                    // Mark specifically linked records (if any)
                    if (justification.attendanceRecords && justification.attendanceRecords.length > 0) {
                        justification.attendanceRecords.forEach((record: any) => {
                            transaction.patch(record._id, { set: { isJustified: true } });
                        });
                    }

                    // Mark all absences on the specified dates
                    if (justification.justifiedDates && justification.justifiedDates.length > 0) {
                        // Find all absent records for this student on these dates
                        // We use count() == 0 or similar but here we need the IDs to patch them.
                        // Sanity doesn't support patch-by-query easily in transactions without knowing IDs
                        // So we fetch the IDs first.
                        const dateFilters = justification.justifiedDates.map((d: string) => `timestamp match "${d}*"`).join(" || ");
                        const query = `*[_type == "attendance" && student._ref == $studentId && status == "absent" && (${dateFilters})]{ _id }`;
                        const recordsToJustify = await sanityClient.fetch(query, { studentId: justification.student._id });

                        recordsToJustify.forEach((record: any) => {
                            transaction.patch(record._id, { set: { isJustified: true } });
                        });
                    }

                    await transaction.commit();
                }

                // 3. Re-check threshold
                const { checkAbsenceThreshold } = await import("@/lib/attendance-logic");
                await checkAbsenceThreshold(justification.student._id);
            }
        } catch (notifErr) {
            console.error("Error sending justification notification:", notifErr);
        }

        return NextResponse.json({ justification: updated });
    } catch (error: any) {
        console.error("Error updating justification status:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
