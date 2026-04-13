// ── Academic Configuration Schema ──────────────────────────────
const academicConfig = {
    name: "academicConfig",
    title: "Academic Configuration",
    type: "document",
    fields: [
        {
            name: "level",
            title: "Level",
            type: "string",
            options: { list: ["L1", "L2", "L3", "M1", "M2"] },
            validation: (R: any) => R.required(),
        },
        {
            name: "studyField",
            title: "Study Field",
            type: "string",
            description: "The department or field this configuration belongs to (e.g. MI, INFORMATIQUE).",
            validation: (R: any) => R.required(),
        },
        {
            name: "specialties",
            title: "Specialties",
            type: "array",
            of: [
                {
                    type: "object",
                    fields: [
                        { name: "name", title: "Specialty Name", type: "string", validation: (R: any) => R.required() },
                        { 
                            name: "groups", 
                            title: "Groups", 
                            type: "array", 
                            of: [{ type: "string" }],
                            validation: (R: any) => R.required()
                        }
                    ]
                }
            ]
        },
        {
            name: "groups",
            title: "Groups (Level-wide)",
            type: "array",
            of: [{ type: "string" }],
            description: "Used if the level has no specialties."
        }
    ],
    preview: {
        select: { title: "level", subtitle: "studyField" },
        prepare({ title, subtitle }: any) {
            return { title: `${title} - ${subtitle || 'Global'}` };
        }
    }
};

export default academicConfig;
