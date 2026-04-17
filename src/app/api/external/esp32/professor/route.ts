export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getDeviceByToken } from "@/lib/sanity/queries";

export async function POST(req: NextRequest) {
    try {
        // ── 1. Device Token Validation ─────────────────────────────────
        const token = req.headers.get("x-device-token");
        if (!token) {
            return NextResponse.json(
                { status: 401, code: "MISSING_TOKEN", description: "Token manquant" },
                { status: 401 }
            );
        }

        const device = await sanityClient.fetch(getDeviceByToken, { token } as any);
        if (!device) {
            return NextResponse.json(
                { status: 401, code: "INVALID_TOKEN", description: "Token invalide" },
                { status: 401 }
            );
        }

        // ── 2. Request Body ───────────────────────────────────────────
        const { uid, sessionDelay, sall } = await req.json();

        // ── 3. UID Check ──────────────────────────────────────────────
        if (!uid) {
            return NextResponse.json(
                { status: 400, code: "MISSING_UID", description: "UID est requis" },
                { status: 400 }
            );
        }

        // ── 4. Professor Search (UID is RFID) ─────────────────────────
        const professor = await sanityClient.fetch(`*[_type == "professor" && rfidUid == $uid][0]{
            _id,
            user->{name}
        }`, { uid });

        if (!professor) {
            return NextResponse.json(
                { status: 404, code: "PROFESSOR_NOT_FOUND", description: "Professeur non reconnu" },
                { status: 404 }
            );
        }

        // ── 5. Schedule Detection ─────────────────────────────────────
        const roomName = sall || device.room?.name;
        if (!roomName) {
            return NextResponse.json(
                { status: 400, code: "ROOM_NOT_FOUND", description: "Salle non spécifiée" },
                { status: 400 }
            );
        }

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const now = new Date();
        const currentDay = days[now.getUTCDay()];
        const currentTime = now.getUTCHours().toString().padStart(2, '0') + ":" +
            now.getUTCMinutes().toString().padStart(2, '0');

        const schedules = await sanityClient.fetch(
            `*[_type == "schedule" && professor._ref == $profId && room == $roomName && day == $day] | order(startTime asc)`,
            { profId: professor._id, roomName, day: currentDay }
        );

        const currentSchedule = schedules.find((s: any) => {
            return currentTime >= s.startTime && currentTime <= s.endTime;
        }) || schedules.find((s: any) => currentTime < s.endTime);

        if (!currentSchedule) {
            return NextResponse.json(
                { status: 404, code: "NO_SCHEDULE", description: "Aucun cours trouvé pour le moment" },
                { status: 404 }
            );
        }

        // ── 6. Session Management ─────────────────────────────────────
        const existingSession = await sanityClient.fetch(
            `*[_type == "session" && schedule._ref == $scheduleId && status == "open" && dateTime(endTime) > dateTime(now())][0]`,
            { scheduleId: currentSchedule._id }
        );

        if (existingSession) {
            return NextResponse.json(
                { status: 200, code: "SESSION_ALREADY_OPEN", session_id: existingSession._id },
                { status: 200 }
            );
        }

        // Create new session
        const duration = sessionDelay || 90;
        const endTime = new Date(now.getTime() + duration * 60 * 1000);

        const session = await sanityClient.create({
            _type: "session",
            schedule: { _type: "reference", _ref: currentSchedule._id },
            professor: { _type: "reference", _ref: professor._id },
            status: "open",
            startTime: now.toISOString(),
            endTime: endTime.toISOString(),
            duration,
        });

        // Update device status
        await sanityClient.patch(device._id).set({ lastSeen: now.toISOString() }).commit();

        return NextResponse.json(
            { status: 200, code: "SESSION_OPENED", session_id: session._id },
            { status: 200 }
        );

    } catch (error) {
        console.error("ESP32 Professor API Error:", error);
        return NextResponse.json(
            { status: 500, code: "SERVER_ERROR", description: "Erreur serveur" },
            { status: 500 }
        );
    }
}
