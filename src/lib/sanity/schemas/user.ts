// ── User Schema ───────────────────────────────────────────────
const user = {
    name: "user",
    title: "User",
    type: "document",
    fields: [
        { name: "name", title: "Full Name", type: "string", validation: (R: any) => R.required() },
        { name: "username", title: "Username (Matricule/EmplID)", type: "string", validation: (R: any) => R.required() },
        { name: "email", title: "Email", type: "string" },
        { name: "password", title: "Password (hashed)", type: "string", validation: (R: any) => R.required() },
        {
            name: "role",
            title: "Role",
            type: "string",
            options: { list: ["student", "professor", "admin"] },
            validation: (R: any) => R.required(),
        },
        { name: "student", title: "Student Record", type: "reference", to: [{ type: "student" }] },
        { 
            name: "studyField", 
            title: "Assigned Study Field", 
            type: "string", 
            description: "For administrators, this limits their management scope to this field (e.g. INFORMATIQUE, MI). Leave empty for Super Admin." 
        },
        { name: "avatar", title: "Avatar URL", type: "string" },
    ],
};
export default user;
