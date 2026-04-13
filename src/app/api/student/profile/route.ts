export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getStudentByUserId } from "@/lib/sanity/queries";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const student = await sanityClient.fetch(getStudentByUserId, { userId: user.id });

        if (!student) {
            return NextResponse.json({ message: "Student record not found" }, { status: 404 });
        }

        // Fetch stats server-side
        const { getAttendanceCount } = await import("@/lib/sanity/queries");
        const stats = await sanityClient.fetch(getAttendanceCount, { studentId: student._id });

        // Fetch unexcused count and threshold
        const unexcusedRecords = await sanityClient.fetch(
            `*[_type == "attendance" && student._ref == $studentId && status == "absent" && isJustified != true]{
                "subjectName": session->schedule->subject->name,
                "subjectCode": session->schedule->subject->code
            }`,
            { studentId: student._id }
        );

        // Group by Subject
        const unexcusedPerSubject: Record<string, { name: string, count: number }> = {};
        unexcusedRecords.forEach((rec: any) => {
            const key = rec.subjectCode || rec.subjectName || "Unknown";
            if (!unexcusedPerSubject[key]) unexcusedPerSubject[key] = { name: rec.subjectName || key, count: 0 };
            unexcusedPerSubject[key].count++;
        });

        const config = await sanityClient.fetch(`*[_type == "systemConfig"][0]{ absentThreshold }`);

        return NextResponse.json({
            student,
            stats: {
                ...stats,
                unexcusedAbsences: unexcusedRecords.length,
                unexcusedPerSubject
            },
            config: {
                absentThreshold: config?.absentThreshold || 3
            }
        });
    } catch (error: any) {
        console.error("Error fetching student profile:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "student") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { email, password } = body;

        const patch: any = {};
        if (email) patch.email = email;
        if (password) {
            patch.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ message: "No changes provided" }, { status: 400 });
        }

        const updated = await sanityClient.patch(user.id).set(patch).commit();

        return NextResponse.json({
            message: "Profile updated successfully",
            user: {
                id: updated._id,
                name: updated.name,
                username: updated.username,
                email: updated.email,
                role: updated.role
            }
        });
    } catch (error: any) {
        console.error("Error updating student profile:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
