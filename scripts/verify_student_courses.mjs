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

async function verifyStudentCourses() {
  console.log("--- Verifying Student Courses Fix ---");
  
  // 1. Fetch a sample student
  const student = await client.fetch(`*[_type == "student"][0]`);
  if (!student) {
    console.error("No student found to test with.");
    return;
  }
  
  console.log(`Testing with student: ${student.matricule} (Level: ${student.level}, Degree: ${student.degree}, Group: ${student.group})`);

  // 2. Fetch courses for this student using the corrected query logic
  const query = `*[_type == "subject" && 
    (lower(degree) == lower($degree) || $degree == "all" || !defined(degree)) && 
    (lower(level) == lower($level) || $level == "all" || !defined(level)) && (
    (!defined(studyField) || studyField == "" || lower(studyField) == "all" || lower(studyField) == lower($studyField) || (lower($studyField) == "info" && lower(studyField) == "informatique") || (lower($studyField) == "informatique" && lower(studyField) == "info")) &&
    (!defined(specialty) || specialty == "" || lower(specialty) == "none" || lower(specialty) == "all" || lower(specialty) == lower($specialty)) &&
    (!defined(groups) || "All" in groups || "all" in groups || $group in groups)
  )]`;

  const courses = await client.fetch(query, {
    degree: student.degree,
    level: student.level,
    studyField: student.studyField,
    specialty: student.specialty,
    group: student.group
  });

  console.log(`Found ${courses.length} subjects matching student profile.`);
  
  if (courses.length > 0) {
    console.log("SUCCESS: Subject entries found for student!");
    courses.slice(0, 3).forEach(c => {
        console.log(` - ${c.code}: ${c.name} (Level: ${c.level}, Groups: ${JSON.stringify(c.groups)})`);
    });
  } else {
    // Check if ANY subjects exist at all
    const totalSubjects = await client.fetch(`count(*[_type == "subject"])`);
    console.log(`Total subjects in DB: ${totalSubjects}`);
    console.log("FAILURE: No subjects matched student criteria.");
  }
}

verifyStudentCourses();
