// ── Attendance Schema ─────────────────────────────────────────
const attendance = {
    name: "attendance",
    title: "Attendance",
    type: "document",
    fields: [
        { name: "session", title: "Session", type: "reference", to: [{ type: "session" }], validation: (R: any) => R.required() },
        { name: "student", title: "Student", type: "reference", to: [{ type: "student" }], validation: (R: any) => R.required() },
        { name: "timestamp", title: "Timestamp", type: "datetime" },
        {
            name: "status",
            title: "Status",
            type: "string",
            options: { list: ["present", "late", "absent"] },
            validation: (R: any) => R.required(),
        },
        { name: "timeIn", title: "Time In", type: "datetime" },
        { name: "timeOut", title: "Time Out", type: "datetime" },
        {
            name: "markedBy",
            title: "Marked By",
            type: "string",
            options: { list: ["device", "manual"] },
            initialValue: "device",
        },
        {
            name: "isJustified",
            title: "Is Justified?",
            description: "If true, this absence is covered by an approved justification and won't count towards exclusion.",
            type: "boolean",
            initialValue: false,
        },
    ],
};
export default attendance;
