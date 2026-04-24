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
    let isMakeUp = false;
    let makeupRequest: any = null;

    // 2. Try to find an approved make-up session for today if no schedule provided
    if (!scheduleId) {
        const today = new Date().toISOString().split('T')[0];
        
        makeupRequest = await sanityClient.fetch(
            `*[_type == "makeUpRequest" && professor._ref == $profId && room == $roomName && requestedDate == $today && status == "approved"][0]{
                _id,
                subject->{ _id, name },
                type,
                group
            }`,
            { profId: professor._id, roomName: device.room?.name, today }
        );

        if (makeupRequest) {
            isMakeUp = true;
            console.log(`Make-up session detected for Prof: ${professor.user?.name}, Room: ${device.room?.name}, Subject: ${makeupRequest.subject?.name}`);
        } else {
            // --- Fallback to regular schedule auto-detect ---
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const now = new Date();
            const currentDay = days[now.getUTCDay()];
            const currentTime = now.getUTCHours().toString().padStart(2, '0') + ":" +
                now.getUTCMinutes().toString().padStart(2, '0');

            console.log(`Auto-detecting schedule for Prof: ${professor.user?.name}, Room: ${device.room?.name}, Day: ${currentDay}, Time: ${currentTime}`);

            const roomName = device.room?.name;
            if (!roomName) {
                return NextResponse.json({ ok: false, error: "Device not assigned to a room" }, { status: 400 });
            }

            const autoSchedule = await sanityClient.fetch(
                `*[_type == "schedule" && professor._ref == $profId && room == $roomName && day == $day] | order(startTime asc)`,
                { profId: professor._id, roomName, day: currentDay }
            );

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
    }

    // 3. Check if session already open
    const existingSessionFilter = isMakeUp 
        ? `*[_type == "session" && professor._ref == $profId && room == $roomName && isMakeUp == true && status == "open" && dateTime(endTime) > dateTime(now())][0]`
        : `*[_type == "session" && schedule._ref == $scheduleId && status == "open" && dateTime(endTime) > dateTime(now())][0]`;
    
    const existingSession = await sanityClient.fetch(existingSessionFilter, { 
        scheduleId, 
        profId: professor._id, 
        roomName: device.room?.name 
    });

    if (existingSession) {
        return NextResponse.json({
            ok: true,
            message: "Session already open",
            sessionId: existingSession._id,
            professorName: professor.user?.name
        });
    }

    // 4. Create session
    const nowMoment = new Date();
    const sessionEndTime = new Date(nowMoment.getTime() + duration * 60 * 1000);

    const sessionDoc: any = {
        _type: "session",
        professor: { _type: "reference", _ref: professor._id },
        status: "open",
        startTime: nowMoment.toISOString(),
        endTime: sessionEndTime.toISOString(),
        duration,
    };

    if (isMakeUp) {
        sessionDoc.isMakeUp = true;
        sessionDoc.subject = { _type: "reference", _ref: makeupRequest.subject?._id };
        sessionDoc.type = makeupRequest.type;
        sessionDoc.group = makeupRequest.group;
        sessionDoc.room = device.room?.name;
    } else {
        sessionDoc.schedule = { _type: "reference", _ref: scheduleId };
    }

    const session = await sanityClient.create(sessionDoc);

    // If make-up, link session to request
    if (isMakeUp && makeupRequest) {
        await sanityClient.patch(makeupRequest._id).set({ session: { _type: "reference", _ref: session._id } }).commit();
    }

    // Update device lastSeen
    await sanityClient.patch(device._id).set({ lastSeen: nowMoment.toISOString() }).commit();

    return NextResponse.json({
        ok: true,
        sessionId: session._id,
        professorName: professor.user?.name,
        message: isMakeUp ? "Make-up session opened successfully" : "Session opened successfully"
    });
}
