export const dynamic = "force-dynamic";
// ============================================================
// GET /api/auth/me — Return current authenticated user
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
        user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            studyField: user.studyField,
        },
    });
}
