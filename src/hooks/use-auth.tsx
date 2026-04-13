// ============================================================
// useAuth Hook — Client-side authentication context
// ============================================================

"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { UserRole } from "@/types";

interface AuthUser {
    id: string;
    name: string;
    username: string;
    role: UserRole;
    studyField?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<AuthUser>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { throw new Error("AuthProvider not found"); },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Check existing session on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch {
            // Not authenticated
        } finally {
            setLoading(false);
        }
    };

    const login = useCallback(async (username: string, password: string) => {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            console.error("Login non-JSON response:", text);
            throw new Error(`Server returned non-JSON response (${res.status})`);
        }

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Login failed");
        }

        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        // Hard redirect to login to clear all internal state and prevent back-navigation to stale state
        window.location.href = "/login";
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
