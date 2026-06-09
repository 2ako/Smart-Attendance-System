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
    // 1. Get the professor
    const professor = await client.fetch(
      `*[_type == 'professor' && (name match 'laidi foughali' || firstName match 'laidi' || lastName match 'foughali')][0]{_id}`
    );
    if (!professor) return;

    // 2. Initial Subjects
    let toDelete = await client.fetch(
      `*[_type == 'subject' && professor._ref == $id]._id`,
      { id: professor._id }
    );
    console.log('Base Subjects:', toDelete);

    // 3. Iteratively find all referencing documents until no more are found
    let foundNew = true;
    let allIds = new Set(toDelete);
    
    while (foundNew) {
      const currentIds = Array.from(allIds);
      const refs = await client.fetch(
        `*[references($ids)]._id`,
        { ids: currentIds }
      );
      
      foundNew = false;
      for (const id of refs) {
        if (!allIds.has(id)) {
          allIds.add(id);
          foundNew = true;
        }
      }
      console.log(`Working... Current set size: ${allIds.size}`);
    }

    const finalIds = Array.from(allIds);
    console.log(`Total documents to delete: ${finalIds.length}`);

    if (finalIds.length > 0) {
      // Chunk deletion to avoid transaction size limits if necessary
      const transaction = client.transaction();
      finalIds.forEach(id => transaction.delete(id));
      const result = await transaction.commit();
      console.log('Complete Purge Successful:', result);
    }

  } catch (err) {
    console.error('Purge Failed:', err);
  }
}

run();
