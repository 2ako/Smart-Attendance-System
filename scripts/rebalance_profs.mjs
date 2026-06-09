import { createClient } from "@sanity/client";
import fs from "fs";

// Load ENV
const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach(line => {
  const [key, value] = line.split("=");
  if (key && value) process.env[key.trim()] = value.trim();
});

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: "2024-01-01",
});

async function rebalanceProfessors() {
  console.log("Starting Rebalancing Process...");
  
  // 1. Fetch current status
  const helpers = await client.fetch(`*[_type == "professor" && (bio match "Helper" || bio match "مساعد")] | order(_createdAt asc)`);
  console.log(`Current Helpers found: ${helpers.length}`);

  const targetHelpers = 15;
  const toDeleteCount = Math.max(0, helpers.length - targetHelpers);
  
  if (toDeleteCount > 0) {
    console.log(`Deleting ${toDeleteCount} excess Helper professors...`);
    // Delete the most recently added ones
    const toDeleteDocs = helpers.slice(targetHelpers);
    
    for (const doc of toDeleteDocs) {
        try {
            // Need to delete both professor doc and the linked user doc
            if (doc.user?._ref) {
                await client.delete(doc.user._ref);
            }
            await client.delete(doc._id);
        } catch (e) {
            console.error(`Failed to delete ${doc._id}: ${e.message}`);
        }
    }
  }

  // 2. Add Main Professors to reach 242
  const currentMain = await client.fetch(`count(*[_type == "professor" && ! (bio match "Helper" || bio match "مساعد")])`);
  const targetMain = 242;
  const toAddMainCount = Math.max(0, targetMain - currentMain);

  console.log(`Current Main Professors: ${currentMain}`);
  console.log(`Need to add: ${toAddMainCount} Main professors`);

  if (toAddMainCount > 0) {
    const BATCH_SIZE = 10;
    const timestamp = Date.now();
    for (let i = 0; i < toAddMainCount; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE && (i + j) < toAddMainCount; j++) {
            const idx = i + j + 1;
            const username = `prof_main_v2_${idx}_${timestamp.toString().slice(-4)}`;
            
            batch.push((async () => {
                try {
                    const user = await client.create({
                        _type: "user",
                        name: `Main Prof V2-${idx}`,
                        username: username,
                        email: `${username}@faculty.edu`,
                        role: "professor",
                        studyField: "Informatique"
                    });
            
                    await client.create({
                        _type: "professor",
                        user: { _type: "reference", _ref: user._id },
                        employeeId: `EMP_MAIN2_${idx}_${timestamp.toString().slice(-4)}`,
                        department: "Informatique",
                        studyField: "Informatique",
                        rank: "MCA",
                        bio: `Main professor generated for workload optimization.`
                    });
                } catch (e) {
                    console.error(`Error adding Main Prof ${idx}: ${e.message}`);
                }
            })());
        }
        await Promise.all(batch);
        console.log(`Added ${Math.min(i + BATCH_SIZE, toAddMainCount)}/${toAddMainCount} Main professors...`);
    }
  }

  console.log("REBALANCING COMPLETE.");
}

rebalanceProfessors();
