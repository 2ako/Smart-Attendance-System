const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function checkDuplicates() {
    const rooms = await sanityClient.fetch(`*[_type == "room"]{name}`);
    const names = rooms.map(r => r.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
        console.log("CRITICAL: Duplicate Room Names Found:", duplicates);
    } else {
        console.log("No duplicate room names found.");
    }
}

checkDuplicates().catch(console.error);
