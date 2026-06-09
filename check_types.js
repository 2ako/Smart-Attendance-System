const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function checkDataTypes() {
    const subjects = await sanityClient.fetch(`*[_type == "subject" && defined(specialty)][0...5]`);
    subjects.forEach(s => {
        console.log(`Subject: ${s.name}`);
        console.log(`- specialty: ${typeof s.specialty} (${JSON.stringify(s.specialty)})`);
    });
}

checkDataTypes().catch(console.error);
