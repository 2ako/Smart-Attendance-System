export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
    getAllStudents,
    getAllDevices,
    getAllRooms,
    getAllSubjects,
    getAllProfessors,
    getAllAcademicConfigs
} from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const isSuperAdmin = !user?.studyField;
        const sfCode = user?.studyField || "";

        // Resolve Study Field ID if it's a code
        let resolvedId = "";
        if (sfCode) {
            const result = await sanityClient.fetch(
                `*[_type == "studyField" && (code == $code || _id == $code || name == $code || title == $code)][0]._id`,
                { code: sfCode }
            );
            resolvedId = result || "";
        }

        const params = {
            studyField: sfCode || "all",
            studyFieldId: resolvedId || sfCode || ""
        };

        // Parallel fetching for common stats
        const commonPromises = {
            students: sanityClient.fetch(getAllStudents, params),
            devices: sanityClient.fetch(getAllDevices, params),
            rooms: sanityClient.fetch(getAllRooms, params),
            subjects: sanityClient.fetch(getAllSubjects, params),
            professors: sanityClient.fetch(getAllProfessors, params),
            configs: sanityClient.fetch(getAllAcademicConfigs),
        };

        // Extra info only for superadmin
        const adminPromise = isSuperAdmin
            ? sanityClient.fetch(`*[_type == "user" && role == "admin"]`)
            : Promise.resolve([]);

        const [
            students,
            devices,
            rooms,
            subjects,
            professors,
            configs,
            admins
        ] = await Promise.all([
            commonPromises.students,
            commonPromises.devices,
            commonPromises.rooms,
            commonPromises.subjects,
            commonPromises.professors,
            commonPromises.configs,
            adminPromise
        ]);

        return NextResponse.json({
            stats: {
                students: students?.length || 0,
                devices: devices?.length || 0,
                rooms: rooms?.length || 0,
                subjects: subjects?.length || 0,
                professors: professors?.length || 0,
                admins: isSuperAdmin ? (admins?.length || 0) : 0,
            },
            academicConfigs: configs || [],
            students: students || [],
        });
    } catch (error: any) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
