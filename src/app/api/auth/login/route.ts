export const dynamic = "force-dynamic";
// ============================================================
// POST /api/auth/login — Authenticate user and return JWT
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { sanityClient } from "@/lib/sanity/client";
import { getUserByUsername } from "@/lib/sanity/queries";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
    console.log("POST /api/auth/login - Request received");
    try {
        const body = await req.json();
        console.log("POST /api/auth/login - Body parsed:", body.username);
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { message: "Username and password are required" },
                { status: 400 }
            );
        }

        // Fetch user from Sanity using username (matricule/employeeId)
        const user = await sanityClient.fetch(getUserByUsername, { username });
        if (!user) {
            return NextResponse.json(
                { message: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { message: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Generate JWT
        const token = await signToken({
            id: user._id,
            username: user.username,
            role: user.role,
            name: user.name,
            studyField: typeof user.studyField === 'object' ? user.studyField?._ref : user.studyField,
        });

        // Set HTTP-only cookie
        const response = NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                studyField: typeof user.studyField === 'object' ? user.studyField?._ref : user.studyField,
            },
        });

        response.cookies.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" && process.env.IS_LOCAL_SERVER !== "true",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 hours
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
