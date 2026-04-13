// ============================================================
// /api/student/assignments — Fetch assignments for the logged-in student
// ============================================================

import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getStudentByUserId, getStudentCourses, getAssignmentsBySubject } from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // 1. Fetch Student Profile to get academic details
        const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });
        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        // 2. Fetch Student Courses to get subject IDs
        const courses = await sanityClient.fetch(getStudentCourses, {
            academicYear: student.academicYear,
            degree: student.degree,
            level: student.level,
            studyField: student.studyField || "",
            specialty: student.specialty || "",
            group: student.group || "",
        });

        const subjectIds = courses.map((c: any) => c._id);

        if (subjectIds.length === 0) {
            return NextResponse.json({ assignments: [] });
        }

        // 3. Fetch Assignments for these subjects
        const assignments = await sanityClient.fetch(getAssignmentsBySubject, { subjectIds });

        return NextResponse.json({ assignments });
    } catch (error: any) {
        console.error("Error fetching assignments:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
