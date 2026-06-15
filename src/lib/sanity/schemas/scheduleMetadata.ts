// ── Schedule Metadata Schema ────────────────────────────────────
const scheduleMetadata = {
    name: "scheduleMetadata",
    title: "Schedule Metadata",
    type: "document",
    fields: [
        { name: "fitness", title: "Fitness Score", type: "number" },
        { name: "hardConflicts", title: "Hard Conflicts", type: "number" },
        { name: "softConflicts", title: "Soft Conflicts", type: "number" },
        { name: "saturdaySlots", title: "Saturday Slots", type: "number" },
        { name: "lateSlots", title: "Late Slots", type: "number" },
        { name: "totalSubjects", title: "Total Subjects", type: "number" },
        { name: "totalRooms", title: "Total Rooms", type: "number" },
        { name: "conflicts", title: "Detailed Conflicts", type: "array", of: [{ type: "string" }] },
        { name: "batchId", title: "Batch ID", type: "string", description: "Uniquely identifies this version of the schedule." },
        { name: "committedAt", title: "Committed At", type: "datetime" },
    ],
};
export default scheduleMetadata;
