// /api/admin/absences — Fetch session history with absence data
// ============================================================
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getFinishedSessionsByStudyField, getSessionCohort } from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const isAdminSuper = !user?.studyField;
        const adminStudyField = user?.studyField || "";

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        // Case 1: Fetch details for a specific session (Absentees list)
        if (sessionId) {
            const session = await sanityClient.fetch(
                `*[_type == "session" && _id == $id][0]{
                    ...,
                    "subject": schedule->subject->{ name, code, level, specialty, group, studyField }
                }`,
                { id: sessionId }
            );

            if (!session) {
                return NextResponse.json({ message: "Session not found" }, { status: 404 });
            }

            const cohort = await sanityClient.fetch(getSessionCohort, {
                sessionId,
                level: session.subject.level,
                studyField: session.subject.studyField,
                specialty: session.subject.specialty || null,
                group: session.subject.group || null,
            });

            return NextResponse.json({ session, cohort });
        }

        // Case 2: Fetch session history for the dashboard
        const sessions = await sanityClient.fetch(getFinishedSessionsByStudyField, {
            studyField: adminStudyField,
        });

        // App-level filtration (more flexible for complex multi-filters)
        const level = searchParams.get("level");
        const specialty = searchParams.get("specialty");
        const group = searchParams.get("group");
        const professor = searchParams.get("professor");

        let filtered = sessions;

        if (level) filtered = filtered.filter((s: any) => s.subject?.level === level);
        if (specialty) filtered = filtered.filter((s: any) => s.subject?.specialty === specialty);
        if (group) filtered = filtered.filter((s: any) => s.subject?.group === group);
        if (professor) {
            filtered = filtered.filter((s: any) =>
                s.professor?.name?.toLowerCase().includes(professor.toLowerCase())
            );
        }

        return NextResponse.json({ sessions: filtered });
    } catch (error) {
        console.error("Error fetching absences data:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
