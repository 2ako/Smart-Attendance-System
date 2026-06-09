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

async function verifyCascadingDelete() {
  console.log("--- Verifying Student Cascading Delete ---");
  
  try {
    // 1. Create a mock student
    const student = await client.create({
      _type: "student",
      matricule: "TEMP_DELETE_TEST",
      firstName: "Test",
      lastName: "Delete",
      dateOfBirth: "01012000",
      group: "G1"
    });
    console.log(`Created mock student: ${student._id}`);

    // 2. Create a mock attendance record
    const attendance = await client.create({
      _type: "attendance",
      student: { _type: "reference", _ref: student._id },
      status: "present",
      markedBy: "manual",
      session: { _type: "reference", _ref: "dummy_session" } // We don't need a real session for this test
    });
    console.log(`Created mock attendance: ${attendance._id} linked to student`);

    // 3. Simulating the deletion logic (we could call the API, but let's test the logic directly)
    console.log("Locating references...");
    const existing = await client.fetch(`*[_type == "student" && _id == $id][0]{ 
        referencingIds: *[references(^._id)]{ _id }
    }`, { id: student._id });

    console.log(`Found referencing IDs: ${JSON.stringify(existing.referencingIds)}`);

    const transaction = client.transaction();
    existing.referencingIds.forEach(ref => transaction.delete(ref._id));
    transaction.delete(student._id);
    
    console.log("Executing cascading delete transaction...");
    await transaction.commit();
    console.log("Transaction committed.");

    // 4. Verify deletion
    const checkStudent = await client.fetch(`*[_id == $id][0]`, { id: student._id });
    const checkAttendance = await client.fetch(`*[_id == $id][0]`, { id: attendance._id });

    if (!checkStudent && !checkAttendance) {
      console.log("SUCCESS: Both student and referencing attendance record were deleted.");
    } else {
      console.error("FAILURE: Some documents still exist.");
      if (checkStudent) console.error(` - Student ${student._id} still exists.`);
      if (checkAttendance) console.error(` - Attendance ${attendance._id} still exists.`);
    }

  } catch (error) {
    console.error("Verification failed with error:", error.message);
  }
}

verifyCascadingDelete();
