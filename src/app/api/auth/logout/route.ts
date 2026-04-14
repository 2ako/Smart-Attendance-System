export const dynamic = "force-dynamic";
// ============================================================
// POST /api/auth/logout — Clear auth cookie
// ============================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TOKEN_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });

    return NextResponse.json({ message: "Logged out" });
}
