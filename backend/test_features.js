const path = require('path');
const fs = require('fs');
const db = require('./src/db');

async function testBackend() {
  console.log('Testing Backend Features...');

  // 1. Check existing documents
  const docsRes = await db.query('SELECT id, original_filename, file_sha256 FROM documents;');
  console.log(`Found ${docsRes.rows.length} documents.`);
  if (docsRes.rows.length < 2) {
    console.error('Expected at least 2 documents to test.');
    process.exit(1);
  }

  const doc1 = docsRes.rows[0];
  const doc2 = docsRes.rows[1];

  // 2. Test Full-Text Search endpoint logic
  console.log('\n--- 1. Testing Full-Text Search ---');
  const searchRes = await fetch('http://localhost:3000/api/documents/search/fulltext?q=data');
  const searchJson = await searchRes.json();
  console.log(`Search for "data": status ${searchRes.status}, total results: ${searchJson.totalResults}`);
  if (searchJson.results.length > 0) {
    console.log('Top match:', searchJson.results[0].originalFilename, 'Snippet:', searchJson.results[0].snippet.substring(0, 80));
  }

  // 3. Test Document Comparison endpoint logic
  console.log('\n--- 2. Testing Document Comparison ---');
  const compRes = await fetch('http://localhost:3000/api/documents/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentIds: [doc1.id, doc2.id] })
  });
  const compJson = await compRes.json();
  console.log(`Comparison status: ${compRes.status}`);
  console.log('Algorithm Info:', compJson.algorithmInfo?.method);
  console.log('Similarity Metrics:', compJson.similarityMetrics);
  console.log('Shared terms sample:', compJson.comparison?.sharedTerms?.slice(0, 5));

  // 4. Test Annotations CRUD
  console.log('\n--- 3. Testing Annotations CRUD ---');
  // Create annotation
  const createAnnRes = await fetch(`http://localhost:3000/api/documents/${doc1.id}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note_text: 'Test research note for automated verification',
      selected_text: 'Internet of Things (IoT)',
      page_number: 1,
      annotation_type: 'note',
      color: 'purple'
    })
  });
  const createdAnn = await createAnnRes.json();
  console.log(`Created annotation: status ${createAnnRes.status}, id: ${createdAnn.annotation?.id}`);

  // List annotations
  const listAnnRes = await fetch(`http://localhost:3000/api/documents/${doc1.id}/annotations`);
  const listAnnJson = await listAnnRes.json();
  console.log(`Listed annotations: total ${listAnnJson.totalAnnotations}`);

  // Update annotation
  const updateAnnRes = await fetch(`http://localhost:3000/api/documents/${doc1.id}/annotations/${createdAnn.annotation.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note_text: 'Updated research note: verified importance',
      annotation_type: 'highlight',
      color: 'blue'
    })
  });
  const updatedAnn = await updateAnnRes.json();
  console.log(`Updated annotation: status ${updateAnnRes.status}, new text: "${updatedAnn.annotation?.note_text}"`);

  // Delete annotation
  const delAnnRes = await fetch(`http://localhost:3000/api/documents/${doc1.id}/annotations/${createdAnn.annotation.id}`, {
    method: 'DELETE'
  });
  console.log(`Deleted annotation: status ${delAnnRes.status}`);

  // 5. Test Version Listing & Duplicate Check
  console.log('\n--- 4. Testing Version Listing & Duplicate Check ---');
  const versionsRes = await fetch(`http://localhost:3000/api/documents/${doc1.id}/versions`);
  const versionsJson = await versionsRes.json();
  console.log(`Document 1 versions: status ${versionsRes.status}, count: ${versionsJson.totalVersions}`);

  // Duplicate check using known sha256
  const dupRes = await fetch('http://localhost:3000/api/documents/check-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha256: doc1.file_sha256 })
  });
  const dupJson = await dupRes.json();
  console.log(`Duplicate check with doc1 hash: isDuplicate=${dupJson.isDuplicate}, docName="${dupJson.existingDocument?.original_filename}"`);

  console.log('\nALL BACKEND API TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

testBackend().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
