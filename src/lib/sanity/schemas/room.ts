// ── Room Schema ───────────────────────────────────────────────
const room = {
    name: "room",
    title: "Room",
    type: "document",
    fields: [
        { name: "name", title: "Room Name", type: "string", validation: (R: any) => R.required() },
        { name: "capacity", title: "Capacity", type: "number" },
        { name: "floor", title: "Floor", type: "number" },
        { name: "studyField", title: "Study Field", type: "reference", to: [{ type: "studyField" }] },
    ],
};
export default room;
