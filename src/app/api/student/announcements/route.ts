export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });

        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        // Student's faculty, level, and specialty
        const studentFacultyId = student.studyField?._id;
        const studentLevel = student.level;
        const studentSpecialty = student.specialty;
        const studentId = student._id;

        // Query fetching announcements where targetAudience is student_body
        // and matches the student's context
        let query = `*[_type == "assignment" && type == "affichage" && (targetAudience == "students" || targetAudience == "student_body" || !defined(targetAudience))`;

        const params: any = {
            studentId,
            studentFacultyId: studentFacultyId || "",
            studentLevel: studentLevel || "",
            studentSpecialty: studentSpecialty || ""
        };

        // Filter conditions
        const filterConditions = [];

        // 1. Faculty Check (If targetFaculties exist, the student's faculty must be in it. Or if targetFaculty exists, it must match. Or it must be a global broadcast without faculties defined)
        if (studentFacultyId) {
            filterConditions.push(`(!defined(targetFaculties) || count(targetFaculties[@._ref == $studentFacultyId]) > 0 || targetFaculty._ref == $studentFacultyId || !defined(targetFaculty))`);
        }

        // 2. Level & Specialty Check (Only if targetType is not individual)
        filterConditions.push(`(
            targetType == "individual" ||
            (
                (!defined(level) || level == "" || level == $studentLevel) &&
                (!defined(specialty) || specialty == "" || specialty == $studentSpecialty)
            )
        )`);

        // 3. Individual Student Check
        filterConditions.push(`(
            targetType != "individual" ||
            (defined(targetStudents) && count(targetStudents[@._ref == $studentId]) > 0)
        )`);

        query += ` && ` + filterConditions.join(" && ") + `] | order(_createdAt desc) {
            _id,
            title,
            description,
            "sender": studyField,
            targetType,
            level,
            specialty,
            _createdAt,
            "attachments": attachments[]{ _key, "url": asset->url, "originalFilename": asset->originalFilename }
        }`;

        const announcements = await sanityClient.fetch(query, params);

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error("Error fetching student announcements:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
