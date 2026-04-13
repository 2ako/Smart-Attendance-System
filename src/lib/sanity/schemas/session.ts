// ── Session Schema ────────────────────────────────────────────
const session = {
    name: "session",
    title: "Session",
    type: "document",
    fields: [
        { name: "schedule", title: "Schedule", type: "reference", to: [{ type: "schedule" }], validation: (R: any) => R.required() },
        { name: "professor", title: "Professor", type: "reference", to: [{ type: "professor" }] },
        {
            name: "status",
            title: "Status",
            type: "string",
            options: { list: ["open", "closed"] },
            initialValue: "open",
        },
        { name: "startTime", title: "Start Time", type: "datetime", validation: (R: any) => R.required() },
        { name: "endTime", title: "End Time", type: "datetime" },
        { name: "duration", title: "Duration (minutes)", type: "number" },
    ],
};
export default session;
