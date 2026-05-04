export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // Fetch requests. If admin has a studyField, only fetch for that faculty.
        const filter = user?.studyField 
            ? `*[_type == "makeUpRequest" && subject->studyField == $studyField]` 
            : `*[_type == "makeUpRequest"]`;
            
        const requests = await sanityClient.fetch(
            `${filter} | order(_createdAt desc){
                ...,
                professor->{ _id, "name": user->name, specialty },
                subject->{ _id, name, code, type, level, degree, specialty, studyField },
            }`,
            { studyField: user?.studyField || "" }
        );

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Error fetching make-up requests:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!hasRole(user, ["admin"])) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { id, status, roomId, roomName, adminComment } = body;

        if (!id || !status) {
            return NextResponse.json({ message: "Missing ID or Status" }, { status: 400 });
        }

        // Safety check: scope verification
        const existing = await sanityClient.fetch(`*[_type == "makeUpRequest" && _id == $id][0]{ subject->{ studyField }, professor->{ _id } }`, { id });
        if (user?.role === "admin" && user?.studyField && existing?.subject?.studyField && existing.subject.studyField !== user.studyField) {
            return NextResponse.json({ message: "Forbidden: Out of scope" }, { status: 403 });
        }

        const patch: any = { status };
        if (adminComment) patch.adminComment = adminComment;
        if (roomName) patch.room = roomName;

        if (status === "approved" && roomName) {
            // ── Notify Professor ────────────────────────────────────────
            try {
                const requestData = await sanityClient.fetch(`*[_type == "makeUpRequest" && _id == $id][0]{ requestedDate }`, { id });
                const profUserId = await sanityClient.fetch(`*[_type == "professor" && _id == $profId][0]{ user->{ _id } }`, { profId: existing.professor._id });
                if (profUserId?.user?._id) {
                    await sanityClient.create({
                        _type: "notification",
                        recipient: { _type: "reference", _ref: profUserId.user._id },
                        type: "administrative",
                        title: "Make-up Request Approved",
                        message: `Your make-up request for ${requestData.requestedDate} has been approved. Room: ${roomName}.`,
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                }
            } catch (notifErr) {
                console.error("Notification error:", notifErr);
            }
        }
 else if (status === "rejected") {
            // Notify rejection
            try {
                const profUserId = await sanityClient.fetch(`*[_type == "professor" && _id == $profId][0]{ user->{ _id } }`, { profId: existing.professor._id });
                if (profUserId?.user?._id) {
                    await sanityClient.create({
                        _type: "notification",
                        recipient: { _type: "reference", _ref: profUserId.user._id },
                        type: "administrative",
                        title: "Make-up Request Rejected",
                        message: `Your make-up request for ${existing.subject?.name} has been rejected.`,
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                }
            } catch (notifErr) {
                console.error("Notification error:", notifErr);
            }
        }

        const updated = await sanityClient.patch(id).set(patch).commit();
        return NextResponse.json({ request: updated });
    } catch (error: any) {
        console.error("Error updating make-up request:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
