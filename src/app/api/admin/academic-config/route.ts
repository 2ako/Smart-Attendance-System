export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { getCurrentUser, isAssignedAdmin } from "@/lib/auth";

export async function POST(req: Request) {
    console.log(">>> [POST] /api/admin/academic-config hit");
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "admin") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const doc = await req.json();

        // Permission Check: Faculty Admins can only modify their assigned studyField
        if (user.studyField && !isAssignedAdmin(user, { code: doc.studyField })) {
            return NextResponse.json({ message: "Forbidden: You only have access to your assigned department" }, { status: 403 });
        }

        // Prepare the document for Sanity
        const { _rev, _createdAt, _updatedAt, ...cleanDoc } = doc;

        const studyFieldCode = cleanDoc.studyField || "GLOBAL";
        const finalId = cleanDoc._id || `academic-config-${studyFieldCode.toLowerCase()}-${cleanDoc.level?.toLowerCase() || 'unknown'}`;

        const preparedDoc = {
            ...cleanDoc,
            _id: finalId,
            studyField: studyFieldCode,
            _type: "academicConfig",
        };

        console.log("Saving Academic Config:", preparedDoc);
        const result = await sanityClient.createOrReplace(preparedDoc);

        // ── [SYNC] Update Parent Study Field ──────────────────────────
        // Critical: Ensure specialties mentioned here have this level in their 'levels' array
        if (studyFieldCode !== "GLOBAL") {
            try {
                const parentField = await sanityClient.fetch(
                    `*[_type == "studyField" && (code == $code || _id == $code)][0]`,
                    { code: studyFieldCode }
                );

                if (parentField) {
                    const currentLevel = preparedDoc.level;
                    const existingSpecs = parentField.specialties || [];
                    const configSpecs = preparedDoc.specialties || [];

                    let updatedSpecs = [...existingSpecs];
                    
                    configSpecs.forEach((newS: any) => {
                        const idx = updatedSpecs.findIndex((ex: any) =>
                            (typeof ex === 'string' ? ex : ex.name) === newS.name
                        );
                        
                        if (idx === -1) {
                            // New specialty found in config, add it with the current level
                            updatedSpecs.push({
                                name: newS.name,
                                groups: newS.groups || ["G1"],
                                levels: [currentLevel]
                            });
                        } else {
                            // Existing specialty: Ensure current level is included
                            const specObj = typeof updatedSpecs[idx] === 'string' 
                                ? { name: updatedSpecs[idx], levels: [], groups: ["G1"] }
                                : { ...updatedSpecs[idx] };
                            
                            const levels = specObj.levels || [];
                            if (!levels.includes(currentLevel)) {
                                specObj.levels = [...levels, currentLevel];
                                updatedSpecs[idx] = specObj;
                            }
                        }
                    });

                    await sanityClient.patch(parentField._id).set({ specialties: updatedSpecs }).commit();
                    console.log(`Synced specialties level-mapping for level: ${currentLevel}`);
                }
            } catch (syncError) {
                console.error("Non-critical Sync Error:", syncError);
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("CRITICAL: Sanity Mutation Error:", error);
        return NextResponse.json(
            { message: error.message || "Academic structure sync failed" },
            { status: error.statusCode || 500 }
        );
    }
}
