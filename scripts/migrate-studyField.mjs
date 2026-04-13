import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const sanityClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-01-01",
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
});

async function migrate() {
    console.log("Starting case standardization for study fields...");
    
    // 1. Students
    const students = await sanityClient.fetch(`*[_type == "student" && defined(studyField)]`);
    if (students.length > 0) {
        const tx = sanityClient.transaction();
        let count = 0;
        students.forEach((s) => {
            if (s.studyField !== s.studyField.toUpperCase()) {
                tx.patch(s._id, { set: { studyField: s.studyField.toUpperCase() } });
                count++;
            }
        });
        if (count > 0) await tx.commit();
        console.log(`Students updated: ${count}`);
    }

    // 2. Professors
    const professors = await sanityClient.fetch(`*[_type == "professor" && defined(department)]`);
    if (professors.length > 0) {
        const tx = sanityClient.transaction();
        let count = 0;
        professors.forEach((p) => {
            if (p.department !== p.department.toUpperCase()) {
                tx.patch(p._id, { set: { department: p.department.toUpperCase() } });
                count++;
            }
        });
        if (count > 0) await tx.commit();
        console.log(`Professors updated: ${count}`);
    }

    // 3. Subjects
    const subjects = await sanityClient.fetch(`*[_type == "subject" && defined(studyField)]`);
    if (subjects.length > 0) {
        const tx = sanityClient.transaction();
        let count = 0;
        subjects.forEach((s) => {
            if (s.studyField !== s.studyField.toUpperCase()) {
                tx.patch(s._id, { set: { studyField: s.studyField.toUpperCase() } });
                count++;
            }
        });
        if (count > 0) await tx.commit();
        console.log(`Subjects updated: ${count}`);
    }

    // 4. Admin Users
    const admins = await sanityClient.fetch(`*[_type == "user" && defined(studyField)]`);
    if (admins.length > 0) {
        const tx = sanityClient.transaction();
        let count = 0;
        admins.forEach((u) => {
            if (u.studyField !== u.studyField.toUpperCase()) {
                tx.patch(u._id, { set: { studyField: u.studyField.toUpperCase() } });
                count++;
            }
        });
        if (count > 0) await tx.commit();
        console.log(`Admin Users updated: ${count}`);
    }

    console.log("Standardization complete!");
}

migrate().catch(console.error);
