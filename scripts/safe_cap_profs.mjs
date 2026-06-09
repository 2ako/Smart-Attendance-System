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
fs.writeFileSync(logFile, "Starting Audit...\n");

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + "\n");
}

async function safeCapProfessors() {
  log("Auditing professor assignments...");
  try {
    // 1. Get all professors
    const allProfs = await client.fetch(`*[_type == "professor"] | order(_createdAt asc)`);
    log(`Current professors in system: ${allProfs.length}`);

    if (allProfs.length <= 100) {
      log("Already at or below 100 professors.");
      return;
    }

    // 2. Identify professors used in Subjects or Schedules (Fetch raw and unique in JS)
    const subjectProfs = await client.fetch(`*[_type == "subject" && defined(professor._ref)].professor._ref`);
    const scheduleProfs = await client.fetch(`*[_type == "schedule" && defined(professor._ref)].professor._ref`);
    
    const usedProfIds = [...new Set([...subjectProfs, ...scheduleProfs])];
    log(`Professors with active assignments: ${usedProfIds.length}`);

    // 3. Decide who to keep
    const usedProfsSet = new Set(usedProfIds);
    const toKeep = [];
    const toDiscard = [];

    for (const prof of allProfs) {
      if (usedProfsSet.has(prof._id)) {
          toKeep.push(prof);
      } else {
          toDiscard.push(prof);
      }
    }

    log(`To Keep (referenced): ${toKeep.length}`);
    log(`Available to discard: ${toDiscard.length}`);

    let finalDiscard = [];
    if (toKeep.length > 100) {
      log(`WARNING: ${toKeep.length} professors are already assigned. Cannot reach 100 without breaking references!`);
      log("Capping at the number of used professors instead...");
      finalDiscard = toDiscard; // Just discard everyone not used
    } else {
      const neededCount = 100 - toKeep.length;
      log(`Keeping ${neededCount} extra non-referenced professors to reach 100.`);
      finalDiscard = toDiscard.slice(neededCount);
    }

    log(`Beginning deletion of ${finalDiscard.length} professors...`);
    
    const BATCH_SIZE = 20;
    for (let i = 0; i < finalDiscard.length; i += BATCH_SIZE) {
        const batch = finalDiscard.slice(i, i + BATCH_SIZE);
        const mutations = [];
        for (const doc of batch) {
            if (doc.user?._ref) mutations.push(client.delete(doc.user._ref));
            mutations.push(client.delete(doc._id));
        }
        await Promise.all(mutations);
        log(`Progress: Deleted ${Math.min(i + BATCH_SIZE, finalDiscard.length)}/ ${finalDiscard.length} items...`);
    }

    const finalCount = await client.fetch(`count(*[_type == "professor"])`);
    log(`FINAL PROFESSOR COUNT: ${finalCount}`);
    
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    if (error.response) log(`RESPONSE: ${JSON.stringify(error.response, null, 2)}`);
  }
}

safeCapProfessors();
