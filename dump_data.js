const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function dumpData() {
    console.log("Fetching subjects...");
    const subjects = await sanityClient.fetch(`*[_type == "subject"]{
        _id, name, type, groups, 
        "professor": professor->{_id, name},
        "level": level,
        "specialty": specialty,
        "room": room->{_id, name}
    }`);
    
    console.log("Fetching rooms...");
    const rooms = await sanityClient.fetch(`*[_type == "room"]{_id, name, type, studyField->{_id, name, code}}`);
    
    const data = { subjects, rooms };
    fs.writeFileSync('scheduler_dump.json', JSON.stringify(data, null, 2));
    console.log("Dumped to scheduler_dump.json");
    
    // Quick load check
    const profLoad = {};
    const groupLoad = {};
    subjects.forEach(s => {
        const pId = s.professor?._id || "No Prof";
        profLoad[pId] = (profLoad[pId] || 0) + 1;
        
        const gs = s.groups || [];
        const spec = s.specialty || "Common";
        const level = s.level || "Unknown";
        if (gs.length === 0 || gs.includes("All")) {
            const key = `${level}-${spec}-All`;
            groupLoad[key] = (groupLoad[key] || 0) + 1;
        } else {
            gs.forEach(g => {
                const key = `${level}-${spec}-${g}`;
                groupLoad[key] = (groupLoad[key] || 0) + 1;
            });
        }
    });
    
    console.log("\nProfessors with > 15 sessions:");
    Object.entries(profLoad).filter(([_, l]) => l > 15).forEach(([p, l]) => console.log(`- ${p}: ${l}`));
    
    console.log("\nGroups with > 15 sessions:");
    Object.entries(groupLoad).filter(([_, l]) => l > 15).forEach(([g, l]) => console.log(`- ${g}: ${l}`));
}

dumpData().catch(console.error);
