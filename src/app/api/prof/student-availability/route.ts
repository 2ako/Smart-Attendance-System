import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser } from "@/lib/auth";
import { TIME_CONFIGS } from "@/lib/scheduler/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "professor") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get("date");
        const subjectId = searchParams.get("subjectId");
        const selectedGroup = searchParams.get("group") || "all";

        if (!dateStr || !subjectId) {
            return NextResponse.json({ message: "Missing parameters" }, { status: 400 });
        }

        // 1. Determine day of week - Use local date to avoid UTC shifts
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const [year, month, day] = dateStr.split('-').map(Number);
        const dayOfWeek = days[new Date(year, month - 1, day).getDay()];

        // 2. Fetch subject details to identify target students
        const subject = await sanityClient.fetch(
            `*[_type == "subject" && _id == $subjectId][0]{
                level,
                specialty,
                studyField
            }`,
            { subjectId }
        );

        if (!subject) {
            return NextResponse.json({ message: "Subject not found" }, { status: 404 });
        }

        // 3. Query existing schedule for these students on this day of week
        // LOGIC FIX:
        // - If selectedGroup is "all", ANY session for this Level/Specialty is a conflict.
        // - If selectedGroup is specific (e.g. G1), only "all" or "G1" sessions are conflicts.
        const scheduleGroupFilter = selectedGroup === "all" 
            ? `true` 
            : `("all" in groups || $selectedGroup in groups)`;

        const scheduleItems = await sanityClient.fetch(
            `*[_type == "schedule" && 
               day == $dayOfWeek && 
               subject->level == $level && 
               subject->specialty == $specialty && 
               subject->studyField == $studyField && 
               ${scheduleGroupFilter}]{
                startTime,
                endTime
            }`,
            { 
                dayOfWeek, 
                level: subject.level, 
                specialty: subject.specialty, 
                studyField: subject.studyField,
                selectedGroup
            }
        );

        // 4. Query already approved makeup requests for this specific date
        const makeupGroupFilter = selectedGroup === "all"
            ? `true`
            : `(group == "all" || group == $selectedGroup)`;

        const approvedMakeups = await sanityClient.fetch(
            `*[_type == "makeUpRequest" && 
               requestedDate == $dateStr && 
               status == "approved" && 
               subject->level == $level && 
               subject->specialty == $specialty && 
               subject->studyField == $studyField && 
               ${makeupGroupFilter}]{
                requestedTime
            }`,
            { 
                dateStr, 
                level: subject.level, 
                specialty: subject.specialty, 
                studyField: subject.studyField,
                selectedGroup
            }
        );

        // 5. Calculate occupied slots
        const occupiedTimes = new Set<string>();
        
        // From regular schedule
        scheduleItems.forEach((item: any) => {
            if (item.startTime) occupiedTimes.add(item.startTime);
        });

        // From approved makeups
        approvedMakeups.forEach((item: any) => {
            if (item.requestedTime) occupiedTimes.add(item.requestedTime);
        });

        // 6. Map to available slots from TIME_CONFIGS
        const availableSlots = TIME_CONFIGS.map(config => ({
            ...config,
            isAvailable: !occupiedTimes.has(config.start)
        }));

        return NextResponse.json({ availableSlots });
    } catch (error) {
        console.error("Error checking student availability:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
