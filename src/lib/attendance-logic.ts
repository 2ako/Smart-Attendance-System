import { sanityClient } from "./sanity/client";

/**
 * Checks a student's unexcused absence count and sends notifications 
 * if they are approaching or have reached the exclusion threshold.
 */
export async function checkAbsenceThreshold(studentId: string) {
    try {
        // 1. Fetch Threshold from System Config
        const config = await sanityClient.fetch(`*[_type == "systemConfig"][0]{ absentThreshold }`);
        const threshold = config?.absentThreshold || 3;

        // 2. Fetch all Unexcused Absences with Subject info
        const unexcusedRecords = await sanityClient.fetch(
            `*[_type == "attendance" && student._ref == $studentId && status == "absent" && isJustified != true]{
                _id,
                "subjectName": session->schedule->subject->name,
                "subjectCode": session->schedule->subject->code
            }`,
            { studentId }
        );

        // 3. Group by Subject Code/Name
        const counts: Record<string, { name: string, count: number }> = {};
        unexcusedRecords.forEach((rec: any) => {
            const key = rec.subjectCode || rec.subjectName || "Unknown";
            if (!counts[key]) counts[key] = { name: rec.subjectName || key, count: 0 };
            counts[key].count++;
        });

        // 4. Send Notifications for each subject at/near threshold
        for (const [code, data] of Object.entries(counts)) {
            if (data.count === threshold - 1) {
                await createNotification(
                    studentId,
                    "attendance_warning",
                    `Warning: Absence Limit (${data.name})`,
                    `You have reached ${data.count} unexcused absences in ${data.name}. One more absence will lead to exclusion.`
                );
            } else if (data.count >= threshold) {
                await createNotification(
                    studentId,
                    "exclusion_alert",
                    `Exclusion Reached (${data.name})`,
                    `You have reached ${data.count} unexcused absences in ${data.name}, meeting the limit of ${threshold}. You are now marked for exclusion in this subject.`
                );
            }
        }
    } catch (error) {
        console.error("Error in checkAbsenceThreshold:", error);
    }
}

async function createNotification(studentId: string, type: string, title: string, message: string) {
    await sanityClient.create({
        _type: "notification",
        recipient: { _type: "reference", _ref: studentId },
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString()
    });
}
