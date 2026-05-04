const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function checkData() {
    const subjects = await sanityClient.fetch(`*[_type == "subject" && defined(professor)]`);
    console.log(`Subjects with professors: ${subjects.length}`);
    
    const professors = await sanityClient.fetch(`*[_type == "professor"]`);
    console.log(`Total professors: ${professors.length}`);

    const rooms = await sanityClient.fetch(`*[_type == "room"]`);
    console.log(`Total rooms: ${rooms.length}`);

    // Groups check
    const groups = subjects.reduce((acc, s) => {
        const key = `${s.level}-${s.specialty || "Common"}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    console.log("Groups distribution:", JSON.stringify(groups, null, 2));
}

checkData().catch(console.error);
