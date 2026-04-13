// ── Notification Schema ────────────────────────────────────────
const notification = {
    name: "notification",
    title: "Student Notification",
    type: "document",
    fields: [
        {
            name: "recipient",
            title: "Recipient",
            type: "reference",
            to: [{ type: "student" }, { type: "user" }],
            validation: (R: any) => R.required()
        },
        {
            name: "type",
            title: "Notification Type",
            type: "string",
            options: { list: ["new_assignment", "graded", "appeal_update", "general", "attendance_present", "attendance_absent", "attendance_late", "deadline_approaching", "deadline_passed", "new_justification", "new_announcement", "justification_approved", "justification_rejected", "attendance_warning", "exclusion_alert"] },
            initialValue: "new_assignment"
        },
        {
            name: "title",
            title: "Title",
            type: "string",
            validation: (R: any) => R.required()
        },
        {
            name: "message",
            title: "Message",
            type: "text"
        },
        {
            name: "assignment",
            title: "Related Assignment",
            type: "reference",
            to: [{ type: "assignment" }]
        },
        {
            name: "isRead",
            title: "Is Read",
            type: "boolean",
            initialValue: false
        },
        {
            name: "createdAt",
            title: "Created At",
            type: "datetime",
            initialValue: () => new Date().toISOString()
        }
    ],
    preview: {
        select: {
            title: "title",
            type: "type",
            isRead: "isRead"
        },
        prepare(selection: any) {
            return {
                title: selection.title,
                subtitle: `${selection.type} • ${selection.isRead ? "Read" : "Unread"}`
            };
        }
    }
};

export default notification;
