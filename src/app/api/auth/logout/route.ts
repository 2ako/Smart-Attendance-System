export const dynamic = "force-dynamic";
// ============================================================
// POST /api/auth/logout — Clear auth cookie
// ============================================================

import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" && process.env.IS_LOCAL_SERVER !== "true",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });
    return response;
}
