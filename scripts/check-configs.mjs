
import { createClient } from '@sanity/client';

const client = createClient({
    projectId: "4vonm4i0",
    dataset: "production",
    useCdn: false,
    apiVersion: '2023-05-03',
    token: "sknQ8OewnjT5MCK58NSwDaQR3dZ6GqmHhkBM902495A1rYMeoA1kSP7xQkhUkBMDvBZyV4oMcrRUqkyYncLSm4pmuctgjEltHdWN96gfJ8qsgK7YJ3nQnRB2sYWbzQl0mnUr9TyBNDDUnVlGas78LOXueNUthJU3By6TqPQfucbhurcvcp1O",
});

async function test() {
    try {
        const configs = await client.fetch(`*[_type == "academicConfig"]`);
        console.log("Total Academic Configs:", configs.length);
        configs.forEach(c => {
            console.log(`- ID: ${c._id}, Level: ${c.level}, StudyField: ${c.studyField}, Groups count: ${c.groups?.length || 0}`);
        });
    } catch (e) {
        console.error(e);
    }
}

test();
