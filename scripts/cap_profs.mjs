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

async function capProfessors() {
  console.log("Capping professors at 100...");
  
  const allProfs = await client.fetch(`*[_type == "professor"] | order(_createdAt asc)`);
  console.log(`Initial count: ${allProfs.length}`);

  if (allProfs.length <= 100) {
    console.log("Already at or below 100 professors.");
    return;
  }

  const toDiscard = allProfs.slice(100);
  console.log(`Deleting ${toDiscard.length} professors...`);

  const BATCH_SIZE = 20;
  for (let i = 0; i < toDiscard.length; i += BATCH_SIZE) {
    const batch = toDiscard.slice(i, i + BATCH_SIZE);
    const mutations = [];
    
    for (const doc of batch) {
        if (doc.user?._ref) {
            mutations.push(client.delete(doc.user._ref));
        }
        mutations.push(client.delete(doc._id));
    }
    
    await Promise.all(mutations);
    console.log(`Progress: Deleted ${Math.min(i + BATCH_SIZE, toDiscard.length)} items...`);
  }

  console.log("CAP COMPLETE. Exactly 100 professors remain.");
}

capProfessors();
