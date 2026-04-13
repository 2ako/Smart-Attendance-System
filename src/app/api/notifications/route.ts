export const dynamic = "force-dynamic";
// ============================================================
// /api/notifications — Student Notification Management
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser } from "@/lib/auth";
import { getStudentCourses } from "@/lib/sanity/queries";

async function syncDeadlines(student: any) {
    try {
        const courses = await sanityClient.fetch(getStudentCourses, {
            academicYear: student.academicYear,
            degree: student.degree,
            level: student.level,
            studyField: student.studyField || "",
            specialty: student.specialty || "",
            group: student.group || "",
        });

        const subjectIds = courses.map((c: any) => c._id);
        if (subjectIds.length === 0) return;

        const query = `
            *[_type == "assignment" && subject._ref in $subjectIds && status == "published" && !defined(*[_type == "submission" && assignment._ref == ^._id && student._ref == $studentId][0])]{
                _id, title, dueDate
            }
        `;
        const pendingAssignments = await sanityClient.fetch(query, { subjectIds, studentId: student._id });

        if (pendingAssignments.length === 0) return;

        const now = new Date();
        const promises = pendingAssignments.map(async (a: any) => {
            const dueDate = new Date(a.dueDate);
            const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (diffHours < 0) {
                const hasNotif = await sanityClient.fetch(`count(*[_type == "notification" && recipient._ref == $studentId && type == "deadline_passed" && assignment._ref == $assignmentId]) > 0`, { studentId: student._id, assignmentId: a._id });
                if (!hasNotif) {
                    await sanityClient.create({
                        _type: "notification",
                        recipient: { _type: "reference", _ref: student._id },
                        type: "deadline_passed",
                        title: "Deadline Passed",
                        message: `The deadline for ${a.title} has passed.`,
                        assignment: { _type: "reference", _ref: a._id },
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                }
            } else if (diffHours <= 24) {
                const hasNotif = await sanityClient.fetch(`count(*[_type == "notification" && recipient._ref == $studentId && type == "deadline_approaching" && assignment._ref == $assignmentId]) > 0`, { studentId: student._id, assignmentId: a._id });
                if (!hasNotif) {
                    await sanityClient.create({
                        _type: "notification",
                        recipient: { _type: "reference", _ref: student._id },
                        type: "deadline_approaching",
                        title: "Deadline Approaching",
                        message: `The deadline for ${a.title} is in less than 24 hours.`,
                        assignment: { _type: "reference", _ref: a._id },
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                }
            }
        });

        await Promise.allSettled(promises);
    } catch (e) {
        console.error("Failed to sync deadlines:", e);
    }
}

// GET: fetch all notifications for the current student or admin
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        let recipientId;
        let student = null;

        if (user.role === "student") {
            // Find the student record linked to this user
            student = await sanityClient.fetch(
                `*[_type == "student" && user._ref == $userId][0]`,
                { userId: user.id }
            );
            if (!student) return NextResponse.json({ notifications: [] });
            recipientId = student._id;
        } else if (user.role === "admin") {
            // Admins receive notifications directly to their user record
            recipientId = user.id;
        } else {
            return NextResponse.json({ notifications: [] });
        }

        const notifications = await sanityClient.fetch(
            `*[_type == "notification" && recipient._ref == $recipientId] | order(createdAt desc) [0...50] {
                _id,
                type,
                title,
                message,
                isRead,
                createdAt,
                "assignment": assignment->{ _id, title, type, dueDate, "subject": subject->{ name, code, level, degree } }
            }`,
            { recipientId }
        );

        const unreadCount = notifications.filter((n: any) => !n.isRead).length;

        if (student) {
            // Perform background sync for student deadlines
            await syncDeadlines(student);
        }

        // Fetch notifications again just in case new ones were created
        const updatedNotifications = await sanityClient.fetch(
            `*[_type == "notification" && recipient._ref == $recipientId] | order(createdAt desc) [0...50] {
                _id,
                type,
                title,
                message,
                isRead,
                createdAt,
                "assignment": assignment->{ _id, title, type, dueDate, "subject": subject->{ name, code, level, degree } }
            }`,
            { recipientId }
        );
        const finalUnreadCount = updatedNotifications.filter((n: any) => !n.isRead).length;

        return NextResponse.json({ notifications: updatedNotifications, unreadCount: finalUnreadCount });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH: mark notification(s) as read
export async function PATCH(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { notificationId, markAllRead } = await req.json();

        if (markAllRead) {
            let recipientId;

            if (user.role === "student") {
                const student = await sanityClient.fetch(
                    `*[_type == "student" && user._ref == $userId][0]{ _id }`,
                    { userId: user.id }
                );
                if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 });
                recipientId = student._id;
            } else if (user.role === "admin") {
                recipientId = user.id;
            } else {
                return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
            }

            const unread = await sanityClient.fetch(
                `*[_type == "notification" && recipient._ref == $recipientId && isRead == false]{ _id }`,
                { recipientId }
            );
            if (unread.length > 0) {
                const transaction = sanityClient.transaction();
                unread.forEach((n: any) => {
                    transaction.patch(n._id, { set: { isRead: true } });
                });
                await transaction.commit();
            }
            return NextResponse.json({ message: "All marked as read" });
        }

        if (notificationId) {
            await sanityClient.patch(notificationId).set({ isRead: true }).commit();
            return NextResponse.json({ message: "Marked as read" });
        }

        return NextResponse.json({ message: "Nothing to update" });
    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
