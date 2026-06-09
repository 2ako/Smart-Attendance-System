const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: '4vonm4i0',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'sknQ8OewnjT5MCK58NSwDaQR3dZ6GqmHhkBM902495A1rYMeoA1kSP7xQkhUkBMDvBZyV4oMcrRUqkyYncLSm4pmuctgjEltHdWN96gfJ8qsgK7YJ3nQnRB2sYWbzQl0mnUr9TyBNDDUnVlGas78LOXueNUthJU3By6TqPQfucbhurcvcp1O',
  useCdn: false,
});

async function run() {
  try {
    const ids = ["5HfN120UQvvCz6r9e476BK", "QpqaiDKX53c2J2KT9DDFY3", "schedule-subject-web"];
    const docs = await client.fetch(`*[_id in $ids]{_id, _type, name, title}`, { ids });
    console.log('Referencing documents:', docs);
    
    const subjectsToDelete = await client.fetch(`*[_type == 'subject' && professor->(name match 'laidi foughali' || firstName match 'laidi' || lastName match 'foughali')]._id`);
    console.log('Subjects to delete:', subjectsToDelete);

    // Find ALL documents referencing these subjects
    const allRefs = await client.fetch(`*[references($ids)]{_id, _type}`, { ids: subjectsToDelete });
    console.log(`Found ${allRefs.length} direct references to the subjects:`, allRefs);

  } catch (err) {
    console.error(err);
  }
}

run();
