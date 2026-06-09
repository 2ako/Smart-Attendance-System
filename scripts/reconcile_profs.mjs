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

async function reconcileProfessors() {
  console.log("Checking current professor counts...");
  
  const allProfs = await client.fetch(`*[_type == "professor"]{ employeeId, bio }`);
  const currentTotal = allProfs.length;
  const currentMainCount = allProfs.filter(p => (p.bio || "").includes("Main")).length;
  const currentHelperCount = allProfs.filter(p => (p.bio || "").includes("Helper")).length;
  
  console.log(`Current Total: ${currentTotal}`);
  console.log(`Current Main: ${currentMainCount}`);
  console.log(`Current Helper: ${currentHelperCount}`);

  const targetMainTotal = 125;
  const targetHelperTotal = 132;

  const mainToAdd = Math.max(0, targetMainTotal - 20 - currentMainCount); // 20 was the initial seed
  const helperToAdd = Math.max(0, targetHelperTotal - 5 - currentHelperCount); // 5 was the initial seed

  console.log(`Need to add: ${mainToAdd} Main, ${helperToAdd} Helper`);

  const generateProf = async (typeLabel, index) => {
    const timestamp = Date.now();
    const username = `prof_${typeLabel.toLowerCase()}_${index}_${Math.floor(Math.random()*10000)}`;
    const employeeId = `EMP_AUTO_${typeLabel[0]}_${index}_${timestamp.toString().slice(-4)}`;
    
    try {
        const user = await client.create({
            _type: "user",
            name: `${typeLabel} Prof ${index}`,
            username: username,
            email: `${username}@faculty.edu`,
            role: "professor",
            studyField: "Informatique"
        });

        await client.create({
            _type: "professor",
            user: { _type: "reference", _ref: user._id },
            employeeId: employeeId,
            department: "Informatique",
            studyField: "Informatique",
            rank: "MCB",
            bio: `${typeLabel} professor generated for workload optimization.`
        });
        return true;
    } catch (e) {
        console.error(`Error adding ${typeLabel} ${index}: ${e.message}`);
        return false;
    }
  };

  const addInBatches = async (typeLabel, count) => {
    const BATCH_SIZE = 10;
    for (let i = 0; i < count; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE && (i + j) < count; j++) {
            batch.push(generateProf(typeLabel, i + j + 1));
        }
        await Promise.all(batch);
        console.log(`Added ${Math.min(i + BATCH_SIZE, count)}/${count} ${typeLabel} professors so far...`);
    }
  };

  if (mainToAdd > 0) await addInBatches("Main", mainToAdd);
  if (helperToAdd > 0) await addInBatches("Helper", helperToAdd);

  console.log("FINAL RECONCILIATION COMPLETE.");
}

reconcileProfessors();
