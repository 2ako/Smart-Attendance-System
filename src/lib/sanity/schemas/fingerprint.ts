// ── Fingerprint Schema ────────────────────────────────────────
const fingerprint = {
    name: "fingerprint",
    title: "Fingerprint",
    type: "document",
    fields: [
        { name: "student", title: "Student", type: "reference", to: [{ type: "student" }], validation: (R: any) => R.required() },
        { name: "fingerprintId", title: "Fingerprint Sensor ID", type: "number", validation: (R: any) => R.required() },
        { name: "templateData", title: "Template Data", type: "text" },
    ],
};
export default fingerprint;
