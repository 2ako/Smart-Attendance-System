export const dynamic = "force-dynamic";
// ============================================================
// GET /api/export/excel — Export attendance as .xlsx
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getAttendanceBySession } from "@/lib/sanity/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
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
            "subject": schedule->subject->{ name, code, type, level, specialty, group, studyField },
            "professor": professor->user->{ name },
            "scheduleProfessor": schedule->professor->user->{ name }
        }`,
        { id: sessionId }
    );

    if (!session) {
        return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    const professorName = session.professor?.name || session.scheduleProfessor?.name || "N/A";
    const sessionType = (session.subject?.type || "Cours").trim();
    const isCours = sessionType.toLowerCase() === "cours";

    // 2. Fetch ALL students that SHOULD be in this session (Cohort)
    // Use the same lenient studyField matching as in other places
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

    // 4. Merge Data (Ensure we don't miss anyone)
    const processedStudentIds = new Set();
    const fullAttendance: any[] = [];

    // Start with cohort
    cohort.forEach((student: any) => {
        const record = attendanceRecords.find((a: any) => a.studentId === student._id);
        fullAttendance.push({
            student,
            status: record ? record.status : "ABSENT",
            timeIn: record ? record.timeIn : null,
            markedBy: record ? record.markedBy : "-"
        });
        processedStudentIds.add(student._id);
    });

    // Add anyone who was present but NOT in cohort (edge cases)
    attendanceRecords.forEach((record: any) => {
        if (!processedStudentIds.has(record.studentId) && record.studentData) {
            fullAttendance.push({
                student: record.studentData,
                status: record.status,
                timeIn: record.timeIn,
                markedBy: record.markedBy || "-"
            });
        }
    });

    const wb = XLSX.utils.book_new();

    const formatData = (items: any[]) => items.map((r: any, i: number) => ({
        "#": i + 1,
        "Student Name": r.student?.fullName || `${r.student?.firstName || ""} ${r.student?.lastName || ""}`.trim() || "N/A",
        "Student ID": r.student?.matricule || "N/A",
        "Group": r.student?.group || "N/A",
        "Status": r.status?.toUpperCase(),
        "Time In": r.timeIn ? new Date(r.timeIn).toLocaleTimeString() : "-",
        "Marked By": r.markedBy || "-",
    }));

    // 5. Logic for split by group (Cours) or single group (TD/TP)
    if (isCours) {
        // Find all unique groups
        // Filter out null/undefined and normalize
        const groups = Array.from(new Set(fullAttendance.map((a: any) => (a.student?.group || "N/A").trim()))).sort();

        if (groups.length === 0) {
            const ws = XLSX.utils.json_to_sheet([{ Message: "No students expected for this session." }]);
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        } else {
            groups.forEach(groupName => {
                const groupRecords = fullAttendance.filter((a: any) => (a.student?.group || "N/A").trim() === groupName);
                const data = formatData(groupRecords);
                const academicInfo = `${session.subject?.level || ""} ${session.subject?.specialty || ""}`.trim();
                const ws = XLSX.utils.aoa_to_sheet([
                    [`Professor: ${professorName}`],
                    [`Subject: ${session.subject?.name || "N/A"} (${session.subject?.code || ""})`],
                    [`Academic: ${academicInfo}`],
                    [`Type: ${sessionType}`],
                    [`Group: ${groupName}`],
                    [`Date: ${new Date(session.startTime).toLocaleDateString()}`],
                    []
                ]);
                XLSX.utils.sheet_add_json(ws, data, { origin: "A9" });

                XLSX.utils.book_append_sheet(wb, ws, `Group ${groupName.replace(/[:\\/?*[\]]/g, "_")}`);
            });
        }
    } else {
        const targetGroup = (session.subject?.group || "N/A").trim();
        const data = formatData(fullAttendance);
        const academicInfo = `${session.subject?.level || ""} ${session.subject?.specialty || ""}`.trim();
        const ws = XLSX.utils.aoa_to_sheet([
            [`Professor: ${professorName}`],
            [`Subject: ${session.subject?.name || "N/A"} (${session.subject?.code || ""})`],
            [`Academic: ${academicInfo}`],
            [`Type: ${sessionType}`],
            [`Group: ${targetGroup}`],
            [`Date: ${new Date(session.startTime).toLocaleDateString()}`],
            []
        ]);
        XLSX.utils.sheet_add_json(ws, data, { origin: "A9" });

        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `attendance-${(session.subject?.name || "Report").replace(/\s+/g, "_")}-${new Date(session.startTime).toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
