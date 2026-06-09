export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { 
    getProfessorByUserId, 
    getStudentByUserId, 
    getSchedulesByProfessor, 
    getSchedulesByStudent 
} from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (user.role === "professor") {
            const professor = await sanityClient.fetch(getProfessorByUserId, { userId: user.id });
            if (!professor) {
                return NextResponse.json({ message: "Professor record not found" }, { status: 404 });
            }
            const schedules = await sanityClient.fetch(getSchedulesByProfessor, { professorId: professor._id });
            return NextResponse.json({ schedules });
        } 
        
        if (user.role === "student") {
            const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });
            if (!student) {
                return NextResponse.json({ message: "Student record not found" }, { status: 404 });
            }
            
            const schedules = await sanityClient.fetch(getSchedulesByStudent, {
                level: student.level,
                studyField: student.studyField,
                specialty: student.specialty || "none",
                group: student.group
            });
            return NextResponse.json({ schedules });
        }

        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    } catch (error: any) {
        console.error("Error fetching personalized schedule:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
