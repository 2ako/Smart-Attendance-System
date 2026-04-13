// ============================================================
// /api/admin/study-fields — Global Study Field Management
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";

/**
 * Helper to ensure the user is a Super Admin
 */
async function getSuperAdmin(user: any) {
    if (!hasRole(user, ["admin"])) return null;
    // Super Admin is an admin with no assigned studyField
    if (user.studyField) return null;
    return user;
}

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        // Allow all admins to GET the list (needed for selection)
        // but restrict mutation to super admins
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const studyFields = await sanityClient.fetch(`
            *[_type == "studyField"] | order(name asc) {
                _id,
                name,
                code,
                systemType,
                years,
                specialties[] {
                    name,
                    levels,
                    groups
                },
                _createdAt
            }
        `);

        const academicConfigs = await sanityClient.fetch(`
            *[_type == "academicConfig"] {
                _id,
                level,
                studyField,
                specialties,
                groups
            }
        `);

        return NextResponse.json({ studyFields, academicConfigs });
    } catch (error) {
        console.error("Error fetching study fields:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!await getSuperAdmin(user)) {
            return NextResponse.json({ message: "Forbidden: Super Admin only" }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, systemType, years, specialties } = body;

        if (!name || !code || !systemType || !years) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const created = await sanityClient.create({
            _type: "studyField",
            name,
            code: code.toUpperCase(),
            systemType,
            years,
            specialties: specialties || [],
        });

        return NextResponse.json({ studyField: created }, { status: 201 });
    } catch (error) {
        console.error("Error creating study field:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!await getSuperAdmin(user)) {
            return NextResponse.json({ message: "Forbidden: Super Admin only" }, { status: 403 });
        }

        const body = await req.json();
        const { _id, name, code, systemType, years, specialties } = body;

        if (!_id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

        const updated = await sanityClient.patch(_id).set({
            name,
            code: code?.toUpperCase(),
            systemType,
            years,
            specialties: specialties || [],
        }).commit();

        return NextResponse.json({ studyField: updated });
    } catch (error) {
        console.error("Error updating study field:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!await getSuperAdmin(user)) {
            return NextResponse.json({ message: "Forbidden: Super Admin only" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

        await sanityClient.delete(id);
        return NextResponse.json({ message: "Study field deleted successfully" });
    } catch (error) {
        console.error("Error deleting study field:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
