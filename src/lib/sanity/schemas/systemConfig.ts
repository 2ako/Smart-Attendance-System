// ── System Configuration Schema ──────────────────────────────
const systemConfig = {
    name: "systemConfig",
    title: "System Settings",
    type: "document",
    fields: [
        {
            name: "facultyName",
            title: "Faculty Name",
            type: "string",
            initialValue: "Faculty of Computer Science",
            validation: (R: any) => R.required(),
        },
        {
            name: "gracePeriodMinutes",
            title: "Attendance Grace Period (Minutes)",
            description: "Students checking in after this time will be marked as 'Late'.",
            type: "number",
            initialValue: 15,
            validation: (R: any) => R.required().min(0).max(120),
        },
        {
            name: "allowManualAttendance",
            title: "Allow Professors to Mark Attendance Manually",
            type: "boolean",
            initialValue: true,
        },
        {
            name: "absentThreshold",
            title: "Exclusion Threshold (Absences)",
            description: "Number of unjustified absences before a student is flagged for exclusion.",
            type: "number",
            initialValue: 3,
            validation: (R: any) => R.required().min(1),
        },
        {
            name: "contactEmail",
            title: "Support Contact Email",
            type: "string",
        },
    ],
};

export default systemConfig;
