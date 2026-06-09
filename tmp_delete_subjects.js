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
    const professor = await client.fetch(
      `*[_type == 'professor' && (name match 'laidi foughali' || firstName match 'laidi' || lastName match 'foughali')][0]{_id, name}`
    );
    console.log('Professor found:', professor);
    
    if (!professor) {
      console.log('No professor found with name "laidi foughali"');
      return;
    }

    const subjects = await client.fetch(
      `*[_type == 'subject' && (professor._ref == $id || professor._id == $id)]{_id, name}`,
      { id: professor._id }
    );
    console.log(`Found ${subjects.length} subjects to delete:`, subjects.map(s => s.name));
    
    if (subjects.length > 0) {
      const transaction = client.transaction();
      subjects.forEach(s => {
        console.log(`Deleting subject: ${s.name} (${s._id})`);
        transaction.delete(s._id);
      });
      const result = await transaction.commit();
      console.log('Successfully deleted subjects:', result);
    } else {
      console.log('No subjects found for this professor.');
    }
  } catch (err) {
    console.error('Error during execution:', err);
  }
}

run();
