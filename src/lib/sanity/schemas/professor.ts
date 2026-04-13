// ── Professor Schema ──────────────────────────────────────────
const professor = {
    name: "professor",
    title: "Professor",
    type: "document",
    fields: [
        { name: "user", title: "User Account", type: "reference", to: [{ type: "user" }], validation: (R: any) => R.required() },
        { name: "employeeId", title: "Employee ID", type: "string", validation: (R: any) => R.required() },
        { name: "firstName", title: "First Name", type: "string" },
        { name: "lastName", title: "Last Name", type: "string" },
        { name: "department", title: "Department", type: "string", validation: (R: any) => R.required() },
        { name: "specialization", title: "Specialization", type: "string" },
        { name: "rfidUid", title: "RFID UID", type: "string" },
    ],
};
export default professor;
