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

const logFile = "scripts/internal_log.txt";
fs.writeFileSync(logFile, "Starting Transactional Deep Audit...\n");

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + "\n");
}

async function transactionalCap() {
  log("Step 1: Auditing professors...");
  try {
    const allProfs = await client.fetch(`*[_type == "professor"] | order(_createdAt asc)`);
    log(`Current professors in system: ${allProfs.length}`);

    if (allProfs.length <= 100) {
      log("Already at or below 100 professors.");
      return;
    }

    const toDiscard = allProfs.slice(100);
    log(`Attempting to discard ${toDiscard.length} professors via transactions...`);

    let deletedCount = 0;
    for (const prof of toDiscard) {
        // Double check for external references (excluding user/prof circular link)
        const refs = await client.fetch(`*[references($id)]{ _id, _type }`, { id: prof._id });
        const blockingRefs = refs.filter(r => r._type !== "user" && r._id !== prof.user?._ref);

        if (blockingRefs.length > 0) {
            log(`SKIP: Professor ${prof.employeeId || prof._id} has external refs: ${blockingRefs.map(r => r._type).join(", ")}`);
            continue;
        }

        try {
            const transaction = client.transaction();
            if (prof.user?._ref) {
                transaction.delete(prof.user._ref);
            }
            transaction.delete(prof._id);
            await transaction.commit();
            deletedCount++;
            if (deletedCount % 10 === 0) log(`Progress: Deleted ${deletedCount} professors.`);
        } catch (e) {
            log(`ERROR: Transaction failed for ${prof._id}: ${e.message}`);
        }
    }

    const finalCount = await client.fetch(`count(*[_type == "professor"])`);
    log(`FINAL PROFESSOR COUNT: ${finalCount}`);

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
  }
}

transactionalCap();
