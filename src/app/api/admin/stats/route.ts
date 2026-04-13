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

        const isSuperAdmin = !user.studyField;
        const sfCode = user.studyField || "";

        // Resolve Study Field ID if it's a code
        let resolvedId = "";
        if (sfCode) {
            const result = await sanityClient.fetch(
                `*[_type == "studyField" && (code == $code || _id == $code)][0]._id`,
                { code: sfCode }
            );
            resolvedId = result || "";
        }

        const params = {
            studyField: sfCode || "all",
            studyFieldId: resolvedId || sfCode || ""
        };

        // Parallel fetching
        const queries = [
            sanityClient.fetch(getAllStudents, params),
            sanityClient.fetch(getAllDevices, params),
            sanityClient.fetch(getAllRooms, params),
            sanityClient.fetch(getAllSubjects, params),
            sanityClient.fetch(getAllAcademicConfigs),
        ];

        if (isSuperAdmin) {
            queries.push(sanityClient.fetch(`*[_type == "user" && role == "admin"]`));
            queries.push(sanityClient.fetch(getAllProfessors, { studyField: "" }));
        }

        const results = await Promise.all(queries);

        return NextResponse.json({
            stats: {
                students: results[0]?.length || 0,
                devices: results[1]?.length || 0,
                rooms: results[2]?.length || 0,
                subjects: results[3]?.length || 0,
                admins: isSuperAdmin ? (results[5]?.length || 0) : 0,
                professors: isSuperAdmin ? (results[6]?.length || 0) : 0,
            },
            academicConfigs: results[4] || [],
            students: results[0] || [], // To populate the students list if needed
        });
    } catch (error: any) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
