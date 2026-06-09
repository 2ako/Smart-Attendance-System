/**
 * Diagnostic Script: Find all documents referencing a specific ID
 * Usage: npx tsx /tmp/find_referencers.ts <ID>
 */
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
    apiVersion: "2023-05-03",
});

const targetId = process.argv[2];

if (!targetId) {
    console.error("Please provide an ID to search for.");
    process.exit(1);
}

async function findReferencers() {
    console.log(`🔍 Searching for documents referencing: ${targetId}...`);
    
    // Query to find any document that has a reference to the target ID
    // We check for _ref in any field
    const query = `*[references($id)] { _id, _type, title, name }`;
    
    try {
        const results = await client.fetch(query, { id: targetId });
        
        if (results.length === 0) {
            console.log("✅ No references found.");
        } else {
            console.log(`⚠️ Found ${results.length} referencing documents:`);
            results.forEach((doc: any) => {
                console.log(`- Type: ${doc._type}, ID: ${doc._id}, Label: ${doc.title || doc.name || 'N/A'}`);
            });
        }
    } catch (err) {
        console.error("Error searching:", err);
    }
}

findReferencers();
