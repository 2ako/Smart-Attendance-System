// ============================================================
// useRealtime Hook — Sanity Listen-based real-time updates
// ============================================================
// Replaces SSE. Connects directly to Sanity's Real-time Edge
// to listen for document changes in attendance and sessions.

"use client";

import { useEffect, useRef } from "react";
import { sanityClient } from "@/lib/sanity/client";

export type RealtimeEvent =
    | { type: "attendance_update"; sessionId: string; record: any }
    | { type: "attendance_delete"; id: string; sessionId: string }
    | { type: "session_update"; session: any };

interface UseRealtimeOptions {
    /** Called whenever a document change is detected */
    onEvent: (event: RealtimeEvent) => void;
    /** Current active session ID */
    sessionId?: string | null;
    /** Current professor ID (to detect new sessions) */
    professorId?: string | null;
    /** Set to false to skip connecting */
    enabled?: boolean;
}

export function useRealtime({ onEvent, sessionId, professorId, enabled = true }: UseRealtimeOptions) {
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    useEffect(() => {
        if (!enabled) return;

        const subscriptions: any[] = [];
        
        // Helper to bypass Sanity eventual consistency delays for newly created elements
        const fetchRobustly = async (query: string, params: any) => {
            for (let i = 0; i < 4; i++) {
                const result = await sanityClient.fetch(query, params);
                if (result) return result;
                await new Promise(r => setTimeout(r, 600));
            }
            return null;
        };

        // 1. Listen for Attendance changes (New/Update/Delete)
        if (sessionId) {
            const attendanceQuery = `*[_type == "attendance" && session._ref == $sessionId]`;
            const attendanceSub = sanityClient
                .listen(attendanceQuery, { sessionId }, { includeResult: true })
                .subscribe({
                    next: async (update: any) => {
                        if (update.type === "mutation") {
                            if (update.transition === "appear" || update.transition === "update") {
                                const record = update.result;
                                if (record) {
                                    const fullRecord = await fetchRobustly(
                                        `*[_type == "attendance" && _id == $id][0]{
                                            ...,
                                            student->{ _id, firstName, lastName, matricule, studyField, specialty, degree, level, group, user->{ name } }
                                        }`,
                                        { id: record._id }
                                    );
                                    onEventRef.current({ 
                                        type: "attendance_update", 
                                        sessionId, 
                                        record: fullRecord || record 
                                    });
                                }
                            } else if (update.transition === "disappear") {
                                onEventRef.current({ type: "attendance_delete", id: update.documentId, sessionId });
                            }
                        }
                    },
                    error: (err) => {
                        console.error("Sanity Listener Error (Attendance):", err);
                    }
                });
            subscriptions.push(attendanceSub);

            // 2. Listen for current Session changes (Close/Extend)
            const sessionQuery = `*[_type == "session" && _id == $sessionId]`;
            const sessionSub = sanityClient
                .listen(sessionQuery, { sessionId }, { includeResult: true })
                .subscribe({
                    next: async (update: any) => {
                        if (update.type === "mutation" && update.result) {
                            // Fetch full projected session to get subject metadata
                            const fullSession = await fetchRobustly(
                                `*[_type == "session" && _id == $id][0]{
                                    ...,
                                    "subject": coalesce(
                                        schedule->subject->{ name, code, type, level, specialty, group, studyField },
                                        subject->{ name, code, type, level, specialty, group, studyField }
                                    ),
                                    "roomName": coalesce(schedule->room->name, room),
                                    "group": coalesce(schedule->group, group),
                                    schedule->{ ..., subject->{ name, code, type, level, specialty, group, studyField }, room }
                                }`,
                                { id: update.result._id }
                            );
                            
                            // Merge the latest mutation values to bypass eventual consistency delays in the fetch API
                            const mergedSession = { ...(fullSession || {}), ...update.result };
                            onEventRef.current({ type: "session_update", session: mergedSession });
                        }
                    },
                    error: (err) => {
                        console.error("Sanity Listener Error (Session):", err);
                    }
                });
            subscriptions.push(sessionSub);
        }

        // 3. Listen for NEW sessions opened by this professor (if no session active)
        if (professorId && !sessionId) {
            const newSessionQuery = `*[_type == "session" && professor._ref == $professorId && status == "open"]`;
            const newSessionSub = sanityClient
                .listen(newSessionQuery, { professorId }, { includeResult: true })
                .subscribe({
                    next: async (update: any) => {
                        if (update.type === "mutation" && update.transition === "appear" && update.result) {
                             // Fetch full projected session to get subject metadata
                             const fullSession = await fetchRobustly(
                                `*[_type == "session" && _id == $id][0]{
                                    ...,
                                    "subject": coalesce(
                                        schedule->subject->{ name, code, type, level, specialty, group, studyField },
                                        subject->{ name, code, type, level, specialty, group, studyField }
                                    ),
                                    "roomName": coalesce(schedule->room->name, room),
                                    "group": coalesce(schedule->group, group),
                                    schedule->{ ..., subject->{ name, code, type, level, specialty, group, studyField }, room }
                                }`,
                                { id: update.result._id }
                            );
                            onEventRef.current({ type: "session_update", session: fullSession || update.result });
                        }
                    },
                    error: (err) => {
                        console.error("Sanity Listener Error (New Session):", err);
                    }
                });
            subscriptions.push(newSessionSub);
        }

        return () => {
            subscriptions.forEach((sub) => sub.unsubscribe());
        };
    }, [enabled, sessionId, professorId]);
}
