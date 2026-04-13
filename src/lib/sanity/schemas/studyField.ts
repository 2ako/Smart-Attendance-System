// ── Study Field Schema ──────────────────────────────────────────
const studyField = {
    name: "studyField",
    title: "Study Field",
    type: "document",
    fields: [
        {
            name: "name",
            title: "Full Name",
            type: "string",
            description: "e.g. Computer Science, Medicine, Law",
            validation: (R: any) => R.required(),
        },
        {
            name: "code",
            title: "Code (ID)",
            type: "string",
            description: "The uppercase identifier (e.g. INFORMATIQUE, MI, MEDICINE)",
            validation: (R: any) => R.required().custom((code: string) => {
                if (code && code !== code.toUpperCase()) return "Code must be uppercase";
                return true;
            }),
        },
        {
            name: "systemType",
            title: "System Type",
            type: "string",
            options: {
                list: [
                    { title: "LMD (Licence, Master, Doctorate)", value: "LMD" },
                    { title: "Classic System", value: "CLASSIC" },
                ],
            },
            validation: (R: any) => R.required(),
        },
        {
            name: "years",
            title: "Academic Years",
            type: "array",
            of: [{ type: "string" }],
            description: "List of levels available in this field (e.g. L1, L2, L3, M1, M2 or 1st Year, 2nd Year...)",
            validation: (R: any) => R.required().min(1),
        },
        {
            name: "specialties",
            title: "Specialties",
            type: "array",
            of: [
                {
                    type: "object",
                    name: "specialty",
                    title: "Specialty",
                    fields: [
                        {
                            name: "name",
                            title: "Name",
                            type: "string",
                            description: "e.g. RSD, ISIL, GL",
                            validation: (R: any) => R.required(),
                        },
                        {
                            name: "levels",
                            title: "Levels",
                            type: "array",
                            of: [{ type: "string" }],
                            description: "Which academic levels this specialty applies to (e.g. L3, M1, M2). Leave empty for all levels.",
                        },
                        {
                            name: "groups",
                            title: "Groups (Afwaj)",
                            type: "array",
                            of: [{ type: "string" }],
                            description: "e.g. G1, G2, G3",
                        },
                    ],
                    preview: {
                        select: {
                            title: "name",
                        },
                    },
                },
            ],
            description: "Specialties available in this field, with their assigned levels and groups.",
        },
    ],
    preview: {
        select: {
            title: "name",
            subtitle: "code",
        },
    },
};

export default studyField;
