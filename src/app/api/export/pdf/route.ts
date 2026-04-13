export const dynamic = "force-dynamic";
// ============================================================
// GET /api/export/pdf — Export attendance as PDF
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAttendanceBySession } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["professor", "admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const sessionId = new URL(req.url).searchParams.get("sessionId");
        if (!sessionId) {
            return NextResponse.json({ message: "sessionId required" }, { status: 400 });
        }

        // 1. Fetch Session with full context
        const session = await sanityClient.fetch(
            `*[_type == "session" && _id == $id][0]{ 
                ..., 
                "subject": schedule->subject->{ name, code, type, level, specialty, degree, group, studyField },
                "professor": professor->user->{ name },
                "scheduleProfessor": schedule->professor->user->{ name }
            }`,
            { id: sessionId }
        );

        if (!session) {
            return NextResponse.json({ message: "Session not found" }, { status: 404 });
        }

        const professorName = session.professor?.name || session.scheduleProfessor?.name || "N/A";
        const subjectName = session.subject?.name || "N/A";
        const subjectCode = session.subject?.code || "";
        const sessionDate = session?.startTime ? new Date(session.startTime).toLocaleDateString() : "N/A";
        const sessionType = (session.subject?.type || "Cours").trim();
        const isCours = sessionType.toLowerCase() === "cours";

        // 2. Fetch ALL students that SHOULD be in this session (Cohort)
        const cohort = await sanityClient.fetch(
            `*[_type == "student" && 
              level == $level && 
              (
                studyField == $studyField || 
                (lower($studyField) == "info" && (studyField match "informatique" || studyField == "INFORMATIQUE"))
              ) &&
              (specialty == $specialty || $specialty == null) &&
              (group == $group || $group == null || $group == "All")
            ]{
              _id, firstName, lastName, fullName, matricule, group, specialty
            }`,
            {
                level: session.subject.level,
                studyField: session.subject.studyField,
                specialty: session.subject.specialty || null,
                group: session.subject.group || null,
            }
        );

        // 3. Fetch actual attendance records
        const attendanceRecords = await sanityClient.fetch(
            `*[_type == "attendance" && session._ref == $sessionId]{
                ...,
                "studentId": student._ref,
                "studentData": student->{ _id, firstName, lastName, fullName, matricule, group }
            }`,
            { sessionId }
        );

        // 4. Merge Data
        const processedStudentIds = new Set();
        const fullAttendance: any[] = [];

        cohort.forEach((student: any) => {
            const record = attendanceRecords.find((a: any) => a.studentId === student._id);
            fullAttendance.push({
                student,
                status: record ? record.status : "ABSENT",
                timeIn: record ? record.timeIn : null,
            });
            processedStudentIds.add(student._id);
        });

        attendanceRecords.forEach((record: any) => {
            if (!processedStudentIds.has(record.studentId) && record.studentData) {
                fullAttendance.push({
                    student: record.studentData,
                    status: record.status,
                    timeIn: record.timeIn,
                });
            }
        });

        const doc = new jsPDF();

        const generatePage = (groupTitle: string, items: any[], isFirst: boolean) => {
            if (!isFirst) doc.addPage();

            doc.setFontSize(22);
            doc.setTextColor(19, 19, 236); // #1313ec
            doc.text("Attendance Report", 14, 22);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

            doc.setDrawColor(230, 230, 230);
            doc.line(14, 32, 196, 32);

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            const academicInfo = `${session.subject?.level || ""} ${session.subject?.specialty || ""}`.trim();
            doc.text(`Professor: ${professorName}`, 14, 42);
            doc.text(`Subject: ${subjectName} (${subjectCode})`, 14, 49);
            doc.text(`Academic: ${academicInfo}`, 14, 56);
            doc.text(`Type: ${sessionType}`, 14, 63);
            doc.text(`Group: ${groupTitle}`, 14, 70);
            doc.text(`Date: ${sessionDate}`, 14, 77);

            const tableData = items.map((r: any, i: number) => [
                i + 1,
                r.student?.fullName || `${r.student?.firstName || ""} ${r.student?.lastName || ""}`.trim() || "N/A",
                r.student?.matricule || "N/A",
                r.student?.group || "N/A",
                r.status?.toUpperCase(),
                r.timeIn ? new Date(r.timeIn).toLocaleTimeString() : "-",
            ]);

            autoTable(doc, {
                startY: 84,
                head: [["#", "Student Name", "Matricule", "Group", "Status", "Time In"]],
                body: tableData,
                theme: "striped",
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [19, 19, 236], fontStyle: "bold" },
            });
        };

        // 5. Logic for split by group (Cours) or single group (TD/TP)
        if (isCours) {
            const groups = Array.from(new Set(fullAttendance.map((a: any) => (a.student?.group || "N/A").trim()))).sort();
            groups.forEach((groupName, index) => {
                const groupRecords = fullAttendance.filter((a: any) => (a.student?.group || "N/A").trim() === groupName);
                generatePage(groupName, groupRecords, index === 0);
            });
        } else {
            const targetGroup = (session.subject?.group || "N/A").trim();
            generatePage(targetGroup, fullAttendance, true);
        }

        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        const filename = `attendance-${subjectName.replace(/\s+/g, "_")}-${new Date(session.startTime).toISOString().split('T')[0]}.pdf`;

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("PDF Export Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error during PDF generation", error: error.message },
            { status: 500 }
        );
    }
}
