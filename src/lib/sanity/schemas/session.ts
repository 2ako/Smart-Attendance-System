// ── Session Schema ────────────────────────────────────────────
const session = {
    name: "session",
    title: "Session",
    type: "document",
    fields: [
        { name: "schedule", title: "Schedule", type: "reference", to: [{ type: "schedule" }] }, // Optional for Make-up classes
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
        { name: "isMakeUp", title: "Is Make-up Class", type: "boolean", initialValue: false },
        { name: "subject", title: "Direct Subject Reference", type: "reference", to: [{ type: "subject" }] }, // Used for make-up
        { name: "room", title: "Direct Room Reference", type: "string" }, // Used for make-up
        { name: "type", title: "Class Type", type: "string" }, // Used for make-up (cour, td, tp)
    ],
};
export default session;
