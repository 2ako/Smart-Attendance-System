export default {
    name: 'justification',
    title: 'Absence Justification',
    type: 'document',
    fields: [
        {
            name: 'student',
            title: 'Student',
            type: 'reference',
            to: [{ type: 'student' }],
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: 'title',
            title: 'Title / Subject',
            type: 'string',
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: 'description',
            title: 'Description',
            type: 'text',
        },
        {
            name: 'file',
            title: 'Justification Document',
            description: 'Upload a PDF, image, or document justifying the absence.',
            type: 'file',
            options: {
                accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx'
            },
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: 'status',
            title: 'Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Pending', value: 'pending' },
                    { title: 'Approved', value: 'approved' },
                    { title: 'Rejected', value: 'rejected' },
                ],
                layout: 'radio'
            },
            initialValue: 'pending'
        },
        {
            name: 'submissionDate',
            title: 'Submission Date',
            type: 'datetime',
            initialValue: () => new Date().toISOString()
        },
        {
            name: 'attendanceRecords',
            title: 'Attendance Records',
            description: 'Link specific absences to this justification.',
            type: 'array',
            of: [{ type: 'reference', to: [{ type: 'attendance' }] }],
        },
        {
            name: 'justifiedDates',
            title: 'Justified Dates',
            description: 'The specific days for which the student is providing justification (e.g., 2024-04-12).',
            type: 'array',
            of: [{ type: 'string' }],
        }
    ],
    preview: {
        select: {
            title: 'title',
            subtitle: 'student.user.name',
            status: 'status'
        },
        prepare({ title, subtitle, status }: any) {
            return {
                title: title,
                subtitle: `${subtitle} - [${status.toUpperCase()}]`
            }
        }
    }
}
