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
      `*[_type == 'professor' && (name match 'laidi foughali' || firstName match 'laidi' || lastName match 'foughali')][0]{_id, name}`
    );
    console.log('Professor found:', professor);
    if (!professor) return;

    // 2. Get the subjects
    const subjects = await client.fetch(
      `*[_type == 'subject' && professor._ref == $id]{_id, name}`,
      { id: professor._id }
    );
    const subjectIds = subjects.map(s => s._id);
    console.log('Subject IDs to delete:', subjectIds);

    // 3. Find all referencing documents
    const referencingDocs = await client.fetch(
      `*[references($ids)]{_id, _type}`,
      { ids: subjectIds }
    );
    console.log(`Found ${referencingDocs.length} referencing documents:`, referencingDocs);

    // 4. Group by type
    const byType = referencingDocs.reduce((acc, doc) => {
      acc[doc._type] = (acc[doc._type] || 0) + 1;
      return acc;
    }, {});
    console.log('Referencing types:', byType);

    // 5. Delete everything in one transaction (referencing docs + subjects)
    if (referencingDocs.length > 0 || subjectIds.length > 0) {
      const transaction = client.transaction();
      referencingDocs.forEach(doc => {
        console.log(`Adding to transaction: ${doc._type} (${doc._id})`);
        transaction.delete(doc._id);
      });
      subjectIds.forEach(id => {
        console.log(`Adding to transaction: subject (${id})`);
        transaction.delete(id);
      });
      const result = await transaction.commit();
      console.log('Deletion successful!', result);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
