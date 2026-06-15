// ── Schedule Schema ───────────────────────────────────────────
const schedule = {
    name: "schedule",
    title: "Schedule",
    type: "document",
    fields: [
        { name: "subject", title: "Subject", type: "reference", to: [{ type: "subject" }], validation: (R: any) => R.required() },
        { name: "professor", title: "Professor", type: "reference", to: [{ type: "professor" }], validation: (R: any) => R.required() },
        { name: "room", title: "Room (Classroom)", type: "string", validation: (R: any) => R.required() },
        { name: "day", title: "Day", type: "string", options: { list: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] } },
        { name: "startTime", title: "Start Time", type: "string" },
        { name: "endTime", title: "End Time", type: "string" },
        { name: "groups", title: "Student Groups", type: "array", of: [{ type: "string" }] },
        { name: "isActive", title: "Is Active", type: "boolean", initialValue: true, description: "Active schedules are currently in use. Inactive schedules are kept for historical session records." },
        { name: "batchId", title: "Batch ID", type: "string", description: "Groups schedules created in the same commitment batch." },
    ],
};
export default schedule;
