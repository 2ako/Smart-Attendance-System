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

async function verifyStudentSchedule() {
  console.log("--- Verifying Student Schedule Fix ---");
  
  // 1. Fetch a sample student
  const student = await client.fetch(`*[_type == "student"][0]`);
  if (!student) {
    console.error("No student found to test with.");
    return;
  }
  
  console.log(`Testing with student: ${student.matricule} (Level: ${student.level}, Group: ${student.group})`);

  // 2. Fetch schedules for this student using the corrected query logic
  const query = `*[_type == "schedule" && (
    subject->level == $level && (
        !defined(groups) || "All" in groups || "all" in groups || $group in groups
    )
  )]`;

  const schedules = await client.fetch(query, {
    level: student.level,
    group: student.group
  });

  console.log(`Found ${schedules.length} schedule entries for this student.`);
  
  if (schedules.length > 0) {
    console.log("SUCCESS: Schedule entries found for student!");
    schedules.slice(0, 3).forEach(s => {
        console.log(` - ${s.day} ${s.startTime}: Subject ID ${s.subject?._ref}`);
    });
  } else {
    // Check if ANY schedules exist at all
    const totalSchedules = await client.fetch(`count(*[_type == "schedule"])`);
    console.log(`Total schedules in DB: ${totalSchedules}`);
    console.log("FAILURE: No schedules matched student criteria.");
  }
}

verifyStudentSchedule();
