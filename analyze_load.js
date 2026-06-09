const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function analyzeLoad() {
    const subjects = await sanityClient.fetch(`*[_type == "subject" && defined(professor)]`);
    
    const profLoad = {};
    const groupLoad = {};

    subjects.forEach(s => {
        const pId = s.professor._ref || s.professor._id;
        profLoad[pId] = (profLoad[pId] || 0) + 1;

        const level = s.level || "Unknown";
        const spec = s.specialty || "Common";
        const groups = s.groups || ["All"];
        
        groups.forEach(g => {
            const gk = `${level}-${spec}-${g}`;
            groupLoad[gk] = (groupLoad[gk] || 0) + 1;
        });

        if (groups.includes("All")) {
            // "All" affects all groups in that specialty
            // (Assuming 2-4 groups per specialty for now)
            // But let's just track the specialty-level load
            const sk = `${level}-${spec}-TOTAL`;
            groupLoad[sk] = (groupLoad[sk] || 0) + 1;
        }
    });

    console.log("Professor Loads (>15 sessions):", 
        Object.fromEntries(Object.entries(profLoad).filter(([_, v]) => v > 15)));
    
    console.log("Group/Spec Loads (>15 sessions):", 
        Object.fromEntries(Object.entries(groupLoad).filter(([_, v]) => v > 15)));
}

analyzeLoad().catch(console.error);
