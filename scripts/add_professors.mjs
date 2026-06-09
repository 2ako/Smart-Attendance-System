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

async function addProfessors() {
  console.log("Starting Professor Generation...");

  const studyFields = ["Informatique"];
  const departments = ["Informatique"];
  const ranks = ["Professeur", "MCA", "MCB", "MAA", "MAB"];

  // Total more needed: 232
  // Type A (Main): 105
  // Type B (Helpers): 127
  
  const toAdd = [
    { count: 105, type: "Full", typeLabel: "Main" },
    { count: 127, type: "Helper", typeLabel: "Helper" }
  ];

  let employeeCounter = 30; // Assuming 1-25 already exist
  let addedCount = 0;

  for (const group of toAdd) {
    console.log(`Adding ${group.count} ${group.typeLabel} professors...`);
    
    for (let i = 0; i < group.count; i++) {
        const id = `prof_gen_${addedCount}_${Date.now()}`;
        const employeeId = `EMP${employeeCounter++}`;
        const name = `${group.typeLabel} Prof ${i + 1}`;
        const username = `prof_${addedCount}_${Math.floor(Math.random()*1000)}`;

        try {
            // 1. Create User
            const user = await client.create({
                _type: "user",
                name: name,
                username: username,
                email: `${username}@faculty.edu`,
                role: "professor",
                studyField: "Informatique"
            });

            // 2. Create Professor Profile
            await client.create({
                _type: "professor",
                user: { _type: "reference", _ref: user._id },
                employeeId: employeeId,
                department: "Informatique",
                studyField: "Informatique",
                rank: ranks[Math.floor(Math.random() * ranks.length)],
                bio: `${group.typeLabel} professor generated for workload optimization.`
            });

            addedCount++;
            if (addedCount % 10 === 0) console.log(`Progress: ${addedCount}/232 added...`);
        } catch (err) {
            console.error(`Failed to add professor ${i}:`, err.message);
        }
    }
  }

  console.log(`Finished! Total professors added: ${addedCount}`);
}

addProfessors();
