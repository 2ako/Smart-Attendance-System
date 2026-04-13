// ── Device Schema ─────────────────────────────────────────────
const device = {
    name: "device",
    title: "IoT Device",
    type: "document",
    fields: [
        { name: "deviceId", title: "Device ID", type: "string", validation: (R: any) => R.required() },
        { name: "deviceToken", title: "Device Token", type: "string", validation: (R: any) => R.required() },
        { name: "room", title: "Assigned Room", type: "reference", to: [{ type: "room" }] },
        {
            name: "type",
            title: "Device Type",
            type: "string",
            options: { list: ["rfid", "fingerprint", "hybrid"] },
        },
        { name: "isActive", title: "Active", type: "boolean", initialValue: true },
        { name: "lastSeen", title: "Last Seen", type: "datetime" },
        { name: "studyField", title: "Study Field", type: "reference", to: [{ type: "studyField" }] },
    ],
};
export default device;
