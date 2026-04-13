// ── Subject Schema ────────────────────────────────────────────
const subject = {
    name: "subject",
    title: "Subject",
    type: "document",
    fields: [
        { name: "name", title: "Subject Name", type: "string", validation: (R: any) => R.required() },
        { name: "code", title: "Subject Code", type: "string", validation: (R: any) => R.required() },
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
        { name: "group", title: "Group", type: "string" },
        {
            name: "type",
            title: "Course Type",
            type: "string",
            options: { list: ["Cours", "TD"] }
        },
        { name: "professor", title: "Professor", type: "reference", to: [{ type: "professor" }] },
        { name: "semester", title: "Semester", type: "number" },
        { name: "creditHours", title: "Credit Hours", type: "number" },
    ],
};
export default subject;
