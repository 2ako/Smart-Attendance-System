const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function checkConstraints() {
    const subjects = await sanityClient.fetch(`*[_type == "subject" && defined(professor)]`);
    
    let amphiNeeded = 0;
    let tpNeeded = 0;
    let salleNeeded = 0;

    subjects.forEach(s => {
        const groups = s.groups || [];
        const isLarge = groups.includes("All") || groups.length >= 3 || groups.length === 0;
        
        if (s.type === "TP") tpNeeded++;
        else if (s.type === "Cours" && isLarge) amphiNeeded++;
        else salleNeeded++;
    });

    console.log("Session Requirements:");
    console.log(`- AMPHI (Large Cours): ${amphiNeeded} (Capacity: 120)`);
    console.log(`- TP (Labs): ${tpNeeded} (Capacity: 120)`);
    console.log(`- SALLE (TD / Small Cours): ${salleNeeded} (Capacity: 630)`);
}

checkConstraints().catch(console.error);
