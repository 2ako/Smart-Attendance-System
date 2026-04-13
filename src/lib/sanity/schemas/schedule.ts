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
        { name: "group", title: "Student Group", type: "string" },
    ],
};
export default schedule;
