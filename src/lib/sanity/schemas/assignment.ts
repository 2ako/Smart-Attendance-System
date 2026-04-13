// ── Assignment Schema ──────────────────────────────────────────
const assignment = {
    name: "assignment",
    title: "Academic Assignment",
    type: "document",
    fields: [
        {
            name: "title",
            title: "Title",
            type: "string",
            validation: (R: any) => R.required()
        },
        {
            name: "description",
            title: "Description",
            type: "text"
        },
        {
            name: "subject",
            title: "Module / Subject",
            type: "reference",
            to: [{ type: "subject" }],
            description: "Leave empty to make this a global or targeted administrative announcement."
        },
        {
            name: "level",
            title: "Level",
            type: "string",
            options: {
                list: [
                    { title: "L1", value: "L1" },
                    { title: "L2", value: "L2" },
                    { title: "L3", value: "L3" },
                    { title: "M1", value: "M1" },
                    { title: "M2", value: "M2" },
                ]
            },
            description: "Target specific level for announcements (used when no subject is selected)."
        },
        {
            name: "specialty",
            title: "Specialty",
            type: "string",
            description: "Target specific specialty (e.g. RSD, GL, etc.)"
        },
        {
            name: "group",
            title: "Group (Optional)",
            type: "string",
            description: "Target specific group (e.g. G1). Leave empty for all groups in the specialty/level."
        },
        {
            name: "targetAudience",
            title: "Target Audience",
            type: "string",
            options: {
                list: [
                    { title: "Students", value: "students" },
                    { title: "Faculty Admins", value: "faculty_admins" }
                ]
            },
            initialValue: "students"
        },
        {
            name: "targetFaculty",
            title: "Target Faculty (for Admins - Single)",
            type: "reference",
            to: [{ type: "studyField" }],
            hidden: ({ document }: any) => document?.targetAudience !== "faculty_admins",
            description: "Legacy single-faculty field."
        },
        {
            name: "targetFaculties",
            title: "Target Faculties (for Admins)",
            type: "array",
            of: [{ type: "reference", to: [{ type: "studyField" }] }],
            hidden: ({ document }: any) => document?.targetAudience !== "faculty_admins",
            description: "Select one or more faculties to receive this announcement. If left empty, all faculty admins will see it."
        },
        {
            name: "targetType",
            title: "Target Audience Type",
            type: "string",
            options: {
                list: [
                    { title: "Broadcast (Everyone)", value: "global" },
                    { title: "Cohort (Level/Specialty)", value: "cohort" },
                    { title: "Individual Students", value: "individual" }
                ]
            },
            initialValue: "cohort"
        },
        {
            name: "targetStudents",
            title: "Specific Students",
            type: "array",
            of: [{ type: "reference", to: [{ type: "student" }] }],
            description: "Only used when Target Audience Type is 'Individual Students'."
        },
        {
            name: "dueDate",
            title: "Due Date",
            type: "datetime",
            validation: (R: any) => R.required()
        },
        {
            name: "type",
            title: "Assessment Type",
            type: "string",
            options: {
                list: [
                    { title: "Homework", value: "homework" },
                    { title: "Project", value: "project" },
                    { title: "Affichage (Read-only)", value: "affichage" },
                ]
            },
            validation: (R: any) => R.required()
        },
        {
            name: "points",
            title: "Points / Grade",
            type: "number",
            initialValue: 100
        },
        {
            name: "status",
            title: "Status",
            type: "string",
            options: {
                list: [
                    { title: "Draft", value: "draft" },
                    { title: "Published", value: "published" },
                ]
            },
            initialValue: "published"
        },
        {
            name: "attachments",
            title: "Attachments",
            type: "array",
            of: [
                {
                    type: "file",
                    fields: [
                        {
                            name: "description",
                            title: "Description",
                            type: "string"
                        }
                    ]
                }
            ]
        },
    ],
    preview: {
        select: {
            title: "title",
            subjectName: "subject.name",
            type: "type"
        },
        prepare(selection: any) {
            const { title, subjectName, type } = selection;
            return {
                title: title,
                subtitle: `${type.toUpperCase()} • ${subjectName || 'Global'}`
            };
        }
    }
};

export default assignment;
