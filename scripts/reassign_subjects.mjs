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

async function reassignSubjects() {
  console.log("Starting Subject Reassignment...");

  // 1. Fetch all Main Professors (85 target)
  const mainProfs = await client.fetch(`*[_type == "professor" && ! (bio match "Helper" || bio match "مساعد")] | order(_createdAt asc)`);
  console.log(`Found ${mainProfs.length} Main Professors.`);

  // 2. Fetch all subjects
  const subjects = await client.fetch(`*[_type == "subject"]`);
  console.log(`Found ${subjects.length} Subjects.`);

  if (mainProfs.length === 0) {
    console.error("No Main Professors found. Aborting.");
    return;
  }

  // 3. Distribute subjects
  // We'll use a round-robin approach
  let profIndex = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < subjects.length; i += BATCH_SIZE) {
    const batch = subjects.slice(i, i + BATCH_SIZE);
    const mutations = [];

    for (const subject of batch) {
        const assignedProf = mainProfs[profIndex % mainProfs.length];
        mutations.push(
            client.patch(subject._id)
                .set({ professor: { _type: "reference", _ref: assignedProf._id } })
                .commit()
        );
        profIndex++;
    }

    await Promise.all(mutations);
    console.log(`Progress: Reassigned ${Math.min(i + BATCH_SIZE, subjects.length)}/${subjects.length} subjects.`);
  }

  console.log("REASSIGNMENT COMPLETE.");
}

reassignSubjects();
