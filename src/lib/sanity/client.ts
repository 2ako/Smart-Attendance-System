// ============================================================
// Sanity Client Configuration
// ============================================================

import { createClient } from "@sanity/client";

export const sanityClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-01-01",
    useCdn: false, // We need real-time data
    // Only use token on server-side to avoid exposing it and to fix client-side listener issues on Vercel
    token: typeof window === "undefined" ? process.env.SANITY_API_TOKEN : undefined,
});

// Read-only client for public queries
export const sanityReadClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-01-01",
    useCdn: true,
});
