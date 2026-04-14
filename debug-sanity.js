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
        const subjects = await client.fetch(`*[_type == "subject"][0..5]{_id, name, studyField}`);
        console.log(JSON.stringify(subjects, null, 2));
    } catch (err) {
        console.error(err);
    }
}

debug();
