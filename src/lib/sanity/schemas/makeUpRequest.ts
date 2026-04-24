// ── Make-up Request Schema ──────────────────────────────────────
const makeUpRequest = {
    name: "makeUpRequest",
    title: "Make-up Class Request",
    type: "document",
    fields: [
        {
            name: "professor",
            title: "Professor",
            type: "reference",
            to: [{ type: "professor" }],
            validation: (R: any) => R.required()
        },
        {
            name: "subject",
            title: "Subject",
            type: "reference",
            to: [{ type: "subject" }],
            validation: (R: any) => R.required()
        },
        {
            name: "type",
            title: "Type",
            type: "string",
            options: { list: ["cour", "td", "tp"] },
            validation: (R: any) => R.required()
        },
        {
            name: "requestedDate",
            title: "Requested Date",
            type: "date",
            validation: (R: any) => R.required()
        },
        {
            name: "requestedTime",
            title: "Requested Time",
            type: "string", // "HH:mm" format
            validation: (R: any) => R.required()
        },
        {
            name: "status",
            title: "Status",
            type: "string",
            options: { list: ["pending", "approved", "rejected"] },
            initialValue: "pending"
        },
        {
            name: "professorComment",
            title: "Professor's Comment",
            type: "text"
        },
        {
            name: "adminComment",
            title: "Admin Comment",
            type: "text"
        },
        {
            name: "room",
            title: "Assigned Room",
            type: "string" // Assigned upon approval
        },
        {
            name: "group",
            title: "Group",
            type: "string",
            options: { list: ["G1", "G2", "G3", "G4", "all"] },
            initialValue: "all"
        },
        {
            name: "session",
            title: "Linked Session",
            type: "reference",
            to: [{ type: "session" }]
        }
    ],
    preview: {
        select: {
            professor: "professor.user.name",
            subject: "subject.name",
            date: "requestedDate",
            status: "status"
        },
        prepare(selection: any) {
            const { professor, subject, date, status } = selection;
            return {
                title: `${professor || "Unknown"} - ${subject || "No Subject"}`,
                subtitle: `${date} • ${status.toUpperCase()}`
            };
        }
    }
};

export default makeUpRequest;
