// ── RFID Card Schema ──────────────────────────────────────────
const rfidCard = {
    name: "rfidCard",
    title: "RFID Card",
    type: "document",
    fields: [
        { name: "student", title: "Student", type: "reference", to: [{ type: "student" }], validation: (R: any) => R.required() },
        { name: "uid", title: "Card UID", type: "string", validation: (R: any) => R.required() },
        { name: "isActive", title: "Active", type: "boolean", initialValue: true },
    ],
};
export default rfidCard;
