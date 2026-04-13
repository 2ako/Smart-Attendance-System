// ============================================================
// JWT Authentication Utilities
// ============================================================

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { JwtPayload, UserRole } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production"
);

const TOKEN_COOKIE_NAME = "auth-token";

/**
 * Sign a JWT token with user information
 */
export async function signToken(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload } as any)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Get the current authenticated user from cookies
 */
export async function getCurrentUser(): Promise<JwtPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
}

/**
 * Check if a user has one of the allowed roles
 */
export function hasRole(
    user: JwtPayload | null,
    allowedRoles: UserRole[]
): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
}

/**
 * Validate device token for ESP32 API authentication
 */
export async function validateDeviceToken(
    deviceToken: string
): Promise<boolean> {
    // In production: look up the device token in Sanity
    // For now, we validate the token format
    const { sanityClient } = await import("@/lib/sanity/client");
    const device = await sanityClient.fetch<any>(
        `*[_type == "device" && deviceToken == $token && isActive == true][0]`,
        { token: deviceToken } as any
    );
    return !!device;
}
