export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";

export async function POST(req: Request) {
    console.log(">>> [POST] /api/admin/academic-config hit");
    console.log(">>> Token present:", !!process.env.SANITY_API_TOKEN);
    try {
        const doc = await req.json();

        // Prepare the document for Sanity
        const { _rev, _createdAt, _updatedAt, ...cleanDoc } = doc;

        // Prepared doc with stable ID scoped to studyField and level
        // This prevents different departments from overwriting each other's L1/L2 configs
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
        // Ensure that any specialties defined here are also listed in the studyField document
        if (studyFieldCode !== "GLOBAL") {
            try {
                const parentField = await sanityClient.fetch(
                    `*[_type == "studyField" && (code == $code || _id == $code)][0]`,
                    { code: studyFieldCode }
                );

                if (parentField && preparedDoc.specialties) {
                    const existingSpecs = parentField.specialties || [];
                    const newSpecsFromConfig = preparedDoc.specialties.map((s: any) => ({
                        name: s.name,
                        groups: s.groups || []
                        // Note: we don't necessarily overwrite levels here as they are scoped in the config
                    }));

                    // Basic merge: Add missing specialty names to the studyField
                    let updatedSpecs = [...existingSpecs];
                    newSpecsFromConfig.forEach((newS: any) => {
                        const idx = updatedSpecs.findIndex((ex: any) =>
                            (typeof ex === 'string' ? ex : ex.name) === newS.name
                        );
                        if (idx === -1) {
                            updatedSpecs.push(newS);
                        } else {
                            // Optionally update groups if they changed for this level?
                            // For now, just ensuring visibility
                        }
                    });

                    await sanityClient.patch(parentField._id).set({ specialties: updatedSpecs }).commit();
                    console.log(`Synced ${newSpecsFromConfig.length} specialties to Study Field: ${studyFieldCode}`);
                }
            } catch (syncError) {
                console.error("Non-critical Sync Error:", syncError);
                // We don't fail the primary operation for sync issues
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("CRITICAL: Sanity Mutation Error:", {
            message: error.message,
            statusCode: error.statusCode,
            response: error.response?.body,
        });

        return NextResponse.json(
            {
                message: error.message || "Academic structure sync failed",
                details: error.response?.body?.message || null
            },
            { status: error.statusCode || 500 }
        );
    }
}
