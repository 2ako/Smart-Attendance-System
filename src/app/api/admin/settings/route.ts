import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/admin/settings — Get global system settings
export async function GET() {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const settings = await sanityClient.fetch(
        `*[_type == "systemConfig"][0]`
    );

    // Default settings if none found
    const defaultSettings = {
        _type: "systemConfig",
        facultyName: "Faculty of Computer Science",
        gracePeriodMinutes: 15,
        allowManualAttendance: true,
        absentThreshold: 3,
        contactEmail: "support@university.edu"
    };

    return NextResponse.json(settings || defaultSettings);
}

// POST /api/admin/settings — Update global system settings
export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!hasRole(user, ["admin"])) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { facultyName, gracePeriodMinutes, allowManualAttendance, absentThreshold, contactEmail } = body;

    // Find the current settings ID
    const current = await sanityClient.fetch(`*[_type == "systemConfig"][0]{_id}`);

    if (current?._id) {
        await sanityClient
            .patch(current._id)
            .set({
                facultyName,
                gracePeriodMinutes: Number(gracePeriodMinutes),
                allowManualAttendance,
                absentThreshold: Number(absentThreshold),
                contactEmail
            })
            .commit();
    } else {
        await sanityClient.create({
            _type: "systemConfig",
            facultyName,
            gracePeriodMinutes: Number(gracePeriodMinutes),
            allowManualAttendance,
            absentThreshold: Number(absentThreshold),
            contactEmail
        });
    }

    return NextResponse.json({ message: "Settings updated successfully" });
}
