const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function checkRooms() {
    const rooms = await sanityClient.fetch(`*[_type == "room"]{name}`);
    const types = { TP: 0, AMPHI: 0, SALLE: 0 };
    rooms.forEach(r => {
        const n = r.name.toLowerCase();
        if (n.includes("tp") || n.includes("lab")) types.TP++;
        else if (n.startsWith("amphi")) types.AMPHI++;
        else types.SALLE++;
    });
    console.log("Room Types Distribution:", types);
}

checkRooms().catch(console.error);
