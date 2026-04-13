export const dynamic = "force-dynamic";
// ============================================================
// POST /api/device/open-session — ESP32 opens session via RFID
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getDeviceByToken } from "@/lib/sanity/queries";

export async function POST(req: NextRequest) {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) {
        return NextResponse.json({ ok: false, error: "Missing device token" }, { status: 401 });
    }

    const device = await sanityClient.fetch(getDeviceByToken, { token: deviceToken } as any);
    if (!device) {
        return NextResponse.json({ ok: false, error: "Invalid device" }, { status: 403 });
    }

    const { rfidUid, scheduleId: providedScheduleId, duration = 90 } = await req.json();
    if (!rfidUid) {
        return NextResponse.json({ ok: false, error: "rfidUid required" }, { status: 400 });
    }

    // 1. Verify Professor by RFID
    const professor = await sanityClient.fetch(`*[_type == "professor" && rfidUid == $rfidUid][0]{
      _id,
      user->{name}
    }`, { rfidUid });
    if (!professor) {
        return NextResponse.json({ ok: false, error: "Professor not found" }, { status: 404 });
    }

    let scheduleId = providedScheduleId;

    // 2. Try to auto-detect schedule if not provided
    if (!scheduleId) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const now = new Date();
        const currentDay = days[now.getUTCDay()];
        // Format time as HH:mm
        const currentTime = now.getUTCHours().toString().padStart(2, '0') + ":" +
            now.getUTCMinutes().toString().padStart(2, '0');

        console.log(`Auto-detecting schedule for Prof: ${professor.user?.name}, Room: ${device.room?.name}, Day: ${currentDay}, Time: ${currentTime}`);

        // Find schedule matching Professor + Room + Day + (StartTime <= now + 30m buffer)
        // We look for schedules in this room for this professor today.
        const roomName = device.room?.name;
        if (!roomName) {
            return NextResponse.json({ ok: false, error: "Device not assigned to a room" }, { status: 400 });
        }

        const autoSchedule = await sanityClient.fetch(
            `*[_type == "schedule" && professor._ref == $profId && room == $roomName && day == $day] | order(startTime asc)`,
            { profId: professor._id, roomName, day: currentDay }
        );

        // Find the "best" schedule (either currently active or starting soon)
        // For simplicity, we take the one where currentTime is between startTime and endTime, 
        // or the first one that hasn't finished yet.
        const currentSchedule = autoSchedule.find((s: any) => {
            return currentTime >= s.startTime && currentTime <= s.endTime;
        }) || autoSchedule.find((s: any) => currentTime < s.endTime);

        if (!currentSchedule) {
            return NextResponse.json({
                ok: false,
                error: "No matching schedule found for this time and location"
            }, { status: 404 });
        }

        scheduleId = currentSchedule._id;
    }

    // Check if session already open for this schedule
    const existingSession = await sanityClient.fetch(
        `*[_type == "session" && schedule._ref == $scheduleId && status == "open" && dateTime(endTime) > dateTime(now())][0]`,
        { scheduleId }
    );

    if (existingSession) {
        return NextResponse.json({
            ok: true,
            message: "Session already open",
            sessionId: existingSession._id,
            professorName: professor.user?.name
        });
    }

    // Create session
    const nowMoment = new Date();
    const endTime = new Date(nowMoment.getTime() + duration * 60 * 1000);

    const session = await sanityClient.create({
        _type: "session",
        schedule: { _type: "reference", _ref: scheduleId },
        professor: { _type: "reference", _ref: professor._id },
        status: "open",
        startTime: nowMoment.toISOString(),
        endTime: endTime.toISOString(),
        duration,
    });

    // Update device lastSeen
    await sanityClient.patch(device._id).set({ lastSeen: nowMoment.toISOString() }).commit();

    return NextResponse.json({
        ok: true,
        sessionId: session._id,
        professorName: professor.user?.name,
        message: "Session opened successfully"
    });
}
