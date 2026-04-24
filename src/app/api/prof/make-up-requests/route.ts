export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "professor") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const professor = await sanityClient.fetch(
            `*[_type == "professor" && user._ref == $userId][0]`,
            { userId: user.id }
        );

        if (!professor) {
            return NextResponse.json({ message: "Professor not found" }, { status: 404 });
        }

        const requests = await sanityClient.fetch(
            `*[_type == "makeUpRequest" && professor._ref == $profId] | order(_createdAt desc){
                ...,
                subject->{ name, code, type }
            }`,
            { profId: professor._id }
        );

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Error fetching make-up requests:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "professor") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { professorId, subjectId, type, group, requestedDate, requestedTime, comment } = body;

        if (!professorId || !subjectId || !requestedDate || !requestedTime) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const request = await sanityClient.create({
            _type: "makeUpRequest",
            professor: { _type: "reference", _ref: professorId },
            subject: { _type: "reference", _ref: subjectId },
            type: type || "cour",
            group: group || "all",
            requestedDate,
            requestedTime,
            professorComment: comment,
            status: "pending",
        });

        // ── Notify Admins ───────────────────────────────────────────
        try {
            // Find admins for this scope (ideally faculty admins)
            // For now, create a general admin notification
            const subject = await sanityClient.fetch(`*[_type == "subject" && _id == $subjectId][0]`, { subjectId });
            const prof = await sanityClient.fetch(`*[_type == "professor" && _id == $profId][0]{ "name": user->name }`, { profId: professorId });

            // Fetch admin users who might need this notification
            const admins = await sanityClient.fetch(`*[_type == "user" && role == "admin"]{ _id }`);

            if (admins.length > 0) {
                const transaction = sanityClient.transaction();
                for (const adminUser of admins) {
                    transaction.create({
                        _type: "notification",
                        recipient: { _type: "reference", _ref: adminUser._id },
                        type: "administrative",
                        title: "New Make-up Request",
                        message: `Prof. ${prof.name} requested a make-up session for ${subject.name} on ${requestedDate} at ${requestedTime}.`,
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    });
                }
                await transaction.commit();
            }
        } catch (notifErr) {
            console.error("Non-fatal notification error:", notifErr);
        }

        return NextResponse.json({ request }, { status: 201 });
    } catch (error) {
        console.error("Error creating make-up request:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
