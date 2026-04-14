// ============================================================
// Next.js Middleware — Route Protection & Role-Based Access
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production"
);

// Routes that require authentication
const protectedRoutes = ["/student", "/prof", "/admin"];
const roleRouteMap: Record<string, string> = {
    student: "/student",
    professor: "/prof",
    admin: "/admin",
};

import { TOKEN_COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Skip API routes and static files
    if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/login") {
        return NextResponse.next();
    }

    // Check if route needs protection
    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
    if (!isProtected) return NextResponse.next();

    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userRole = payload.role as string;

        // Check if user has access to the requested route
        const allowedRoute = roleRouteMap[userRole];
        if (allowedRoute && !pathname.startsWith(allowedRoute)) {
            // Redirect to their dashboard
            return NextResponse.redirect(new URL(allowedRoute, req.url));
        }

        return NextResponse.next();
    } catch {
        // Invalid token, redirect to login
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
