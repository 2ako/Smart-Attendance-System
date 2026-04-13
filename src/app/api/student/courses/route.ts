export const dynamic = "force-dynamic";
// ============================================================
// GET /api/student/courses — Fetch courses for logged-in student
// ============================================================

import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getStudentByUserId, getStudentCourses } from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // 1. Get student profile details
        const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });

        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        const { group, specialty, studyField, degree, level, academicYear } = student;

        // 2. Fetch courses matching student profile
        const courses = await sanityClient.fetch(getStudentCourses, {
            group: group || "",
            studyField: studyField || "",
            specialty: specialty || "",
            degree: degree || "",
            level: level || "",
            academicYear: academicYear || ""
        });

        return NextResponse.json({ courses });
    } catch (error: any) {
        console.error("Error fetching student courses:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
