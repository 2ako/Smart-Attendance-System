// ── Student Schema ────────────────────────────────────────────
const student = {
    name: "student",
    title: "Student",
    type: "document",
    fields: [
        { name: "user", title: "User Account", type: "reference", to: [{ type: "user" }], validation: (R: any) => R.required() },
        { name: "matricule", title: "Matricule (University Reg #)", type: "string", validation: (R: any) => R.required() },
        { name: "firstName", title: "First Name", type: "string", validation: (R: any) => R.required() },
        { name: "lastName", title: "Last Name", type: "string", validation: (R: any) => R.required() },
        { name: "dateOfBirth", title: "Date of Birth (DDMMYYYY)", type: "string", validation: (R: any) => R.required() },
        { name: "group", title: "Group", type: "string", validation: (R: any) => R.required() },
        { name: "studyField", title: "Study Field", type: "string" },
        { name: "specialty", title: "Specialty", type: "string" },
        {
            name: "degree",
            title: "Degree Level",
            type: "string",
            options: { list: ["Licence", "Master"] }
        },
        {
            name: "level",
            title: "Academic Level",
            type: "string",
            options: { list: ["L1", "L2", "L3", "M1", "M2"] }
        },
        { name: "academicYear", title: "Academic Year", type: "string" },
        { name: "rfidUid", title: "RFID UID", type: "string" },
        { name: "fingerprintId", title: "Fingerprint ID", type: "number" },
    ],
};
export default student;
