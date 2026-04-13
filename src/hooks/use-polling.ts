// ============================================================
// usePolling Hook — Periodic data fetching for realtime updates
// ============================================================

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UsePollingOptions<T> {
    /** URL to fetch data from */
    url: string | null;
    /** Polling interval in milliseconds (default: 3000) */
    interval?: number;
    /** Whether polling is enabled */
    enabled?: boolean;
    /** Transform the response data */
    transform?: (data: any) => T;
}

export function usePolling<T>({
    url,
    interval = 3000,
    enabled = true,
    transform,
}: UsePollingOptions<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = useCallback(async () => {
        if (!url) return;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            const result = transform ? transform(json) : json;
            setData(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [url, transform]);

    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        fetchData();

        // Set up polling
        intervalRef.current = setInterval(fetchData, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchData, interval, enabled]);

    const refetch = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch };
}
