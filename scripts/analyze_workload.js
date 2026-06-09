import { createClient } from "@sanity/client";
import fs from "fs";
import path from "path";

const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach(line => {
  const [key, value] = line.split("=");
  if (key && value) process.env[key.trim()] = value.trim();
});

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2024-01-01",
});

async function analyzeWorkload() {
  const subjects = await client.fetch(`*[_type == "subject"]{
    _id,
    name,
    level,
    specialty,
    groups
  }`);

  console.log(`Total Subjects: ${subjects.length}`);

  let totalCours = subjects.length;
  let totalTD_TP = 0;

  subjects.forEach(s => {
    // Usually, 1 subject has 1 Cours, N TDs, and N TPs
    // Looking at the "groups" field which is usually an array like ["G1", "G2", "G3", "G4"]
    const groupCount = s.groups ? s.groups.length : 1; 
    totalTD_TP += groupCount * 2; // 1 TD + 1 TP per group
  });

  console.log(`Total Cours Sessions: ${totalCours}`);
  console.log(`Total TD/TP Sessions: ${totalTD_TP}`);
  console.log(`Total Sessions: ${totalCours + totalTD_TP}`);

  // Workload per session = 1.5h
  // Max workload per prof per 2 days = 9h (6 sessions)
  
  // Constraint: 1 Main Prof teaches 2 subjects (Cours + some TD/TP)
  // 2 subjects = 2 Cours sessions.
  // 6 - 2 = 4 slots left for TD/TP.
  
  const mainProfsNeeded = Math.ceil(subjects.length / 2);
  const totalTDTPCoveredByMain = mainProfsNeeded * 4;
  const remainingTDTP = Math.max(0, totalTD_TP - totalTDTPCoveredByMain);
  
  const helperProfsNeeded = Math.ceil(remainingTDTP / 6);

  console.log("\n--- CALCULATION RESULTS ---");
  console.log(`Professors Type A (Main - 2 subjects, 2 days): ${mainProfsNeeded}`);
  console.log(`Professors Type B (Helpers - TD/TP only, 2 days): ${helperProfsNeeded}`);
  console.log(`Total Professors Needed: ${mainProfsNeeded + helperProfsNeeded}`);
}

analyzeWorkload();
