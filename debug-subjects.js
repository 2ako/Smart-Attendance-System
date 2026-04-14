const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    useCdn: false,
    apiVersion: '2023-05-03',
    token: process.env.SANITY_API_TOKEN,
});

async function debug() {
    try {
        console.log("=== 1. ALL SUBJECTS (raw) ===");
        const allSubjects = await client.fetch(`*[_type == "subject"]{_id, name, studyField, code}`);
        console.log(`Total subjects: ${allSubjects.length}`);
        console.log(JSON.stringify(allSubjects, null, 2));

        console.log("\n=== 2. ALL ADMIN USERS ===");
        const admins = await client.fetch(`*[_type == "user" && role == "admin"]{_id, name, studyField, username}`);
        console.log(JSON.stringify(admins, null, 2));

        console.log("\n=== 3. ALL STUDY FIELDS ===");
        const studyFields = await client.fetch(`*[_type == "studyField"]{_id, name, code, title}`);
        console.log(JSON.stringify(studyFields, null, 2));

        // Now test the actual query used by the API
        if (admins.length > 0) {
            const admin = admins.find(a => a.studyField) || admins[0];
            const sfCode = admin.studyField || "";
            console.log(`\n=== 4. TESTING QUERY WITH studyField="${sfCode}" ===`);

            // Try to resolve ID
            const resolvedId = await client.fetch(
                `*[_type == "studyField" && (code == $code || _id == $code || name == $code || title == $code)][0]._id`,
                { code: sfCode }
            );
            console.log(`Resolved studyField ID: ${resolvedId}`);

            const params = {
                studyField: sfCode === "all" ? "" : sfCode,
                studyFieldId: resolvedId || (sfCode === "all" ? "" : sfCode)
            };
            console.log("Query params:", params);

            // Execute the actual getAllSubjects query
            const getAllSubjects = `*[_type == "subject" && (
        !defined($studyField) || $studyField == "" || $studyField == "all" || 
        lower(studyField) == lower($studyField) ||
        studyField._ref == $studyFieldId ||
        studyField match $studyField ||
        (lower($studyField) == "info" && lower(studyField) == "informatique") ||
        (lower($studyField) == "informatique" && lower(studyField) == "info")
      )]{_id, name, studyField, code}`;

            const filtered = await client.fetch(getAllSubjects, params);
            console.log(`\nFiltered subjects count: ${filtered.length}`);
            console.log(JSON.stringify(filtered, null, 2));
        }
    } catch (err) {
        console.error("ERROR:", err.message);
    }
}

debug();
