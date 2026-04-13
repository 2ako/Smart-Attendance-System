export default {
    name: 'submission',
    title: 'Assignment Submission',
    type: 'document',
    fields: [
        {
            name: 'assignment',
            title: 'Assignment',
            type: 'reference',
            to: [{ type: 'assignment' }],
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: 'student',
            title: 'Student',
            type: 'reference',
            to: [{ type: 'student' }],
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: 'submissionDate',
            title: 'Submission Date',
            type: 'datetime',
            initialValue: () => new Date().toISOString()
        },
        {
            name: 'file',
            title: 'Submission File',
            type: 'file',
            options: {
                accept: '.pdf,.zip,.jpg,.jpeg,.png,.doc,.docx'
            },
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: 'content',
            title: 'Comments / Notes',
            type: 'text'
        },
        {
            name: 'status',
            title: 'Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Submitted', value: 'submitted' },
                    { title: 'Graded', value: 'graded' },
                ]
            },
            initialValue: 'submitted'
        },
        {
            name: 'grade',
            title: 'Obtained Grade',
            type: 'number'
        },
        {
            name: 'feedback',
            title: 'Professor Feedback',
            type: 'text'
        },
        {
            name: 'appealMessage',
            title: 'Appeal Message',
            type: 'text'
        },
        {
            name: 'appealDate',
            title: 'Appeal Date',
            type: 'datetime'
        },
        {
            name: 'appealStatus',
            title: 'Appeal Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Pending', value: 'pending' },
                    { title: 'Reviewed', value: 'reviewed' },
                    { title: 'Rejected', value: 'rejected' },
                    { title: 'Accepted', value: 'accepted' },
                ]
            }
        }
    ],
    preview: {
        select: {
            title: 'assignment.title',
            studentName: 'student.user.name',
            status: 'status'
        },
        prepare({ title, studentName, status }: any) {
            return {
                title: title,
                subtitle: `${studentName} - [${status.toUpperCase()}]`
            }
        }
    }
}
