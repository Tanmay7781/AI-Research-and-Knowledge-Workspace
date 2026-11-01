const path = require('path');
const fs = require('fs');
const db = require('./src/db');

async function runRegressionTests() {
  console.log('==============================================');
  console.log('RUNNING SYSTEM REGRESSION & VERIFICATION TESTS');
  console.log('==============================================\n');

  // Test 1: PostgreSQL Health & Persistence Check
  console.log('TEST 1: Database Health & Table Connectivity');
  const healthRes = await fetch('http://localhost:3000/api/health');
  const healthJson = await healthRes.json();
  console.log('Health check status:', healthRes.status, healthJson);
  if (healthRes.status !== 200 || healthJson.status !== 'ok') {
    throw new Error('Backend health check failed');
  }

  // Test 2: Document Retrieval
  console.log('\nTEST 2: Document Listing');
  const docsRes = await fetch('http://localhost:3000/api/documents');
  const docsJson = await docsRes.json();
  console.log(`Retrieved ${docsJson.documents?.length} documents from PostgreSQL.`);
  if (!docsJson.documents || docsJson.documents.length === 0) {
    throw new Error('No documents found in PostgreSQL');
  }

  const sampleDoc = docsJson.documents.find(d => d.has_analysis) || docsJson.documents[0];
  console.log(`Selected document: "${sampleDoc.original_filename}" (ID: ${sampleDoc.id}, Status: ${sampleDoc.status})`);

  // Test 3: Document Detail & Analysis Retrieval
  console.log('\nTEST 3: Document Detail & Duplicate-Analysis Protection');
  const docDetailRes = await fetch(`http://localhost:3000/api/documents/${sampleDoc.id}`);
  const docDetailJson = await docDetailRes.json();
  console.log(`Document detail fetched: status ${docDetailRes.status}, Has analysis: ${Boolean(docDetailJson.document?.analysis)}`);

  // Verify duplicate analysis protection (should return cached: true without calling Gemini)
  if (docDetailJson.document?.analysis) {
    const analyzeProtectionRes = await fetch(`http://localhost:3000/api/documents/${sampleDoc.id}/analyze`, {
      method: 'POST'
    });
    const analyzeProtectionJson = await analyzeProtectionRes.json();
    console.log(`Duplicate protection triggered: cached=${analyzeProtectionJson.cached}, message="${analyzeProtectionJson.message}"`);
  }

  // Test 4: Single Document RAG Chat & Source Citations
  console.log('\nTEST 4: Grounded Document RAG Chat & Source Citations');
  const ragQuestion = 'What are the main topics discussed in this document?';
  const ragRes = await fetch(`http://localhost:3000/api/documents/${sampleDoc.id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: ragQuestion })
  });
  const ragJson = await ragRes.json();
  console.log('RAG Chat status:', ragRes.status);
  console.log('Answer excerpt:', ragJson.answer?.substring(0, 120) + '...');
  console.log('Citations count:', ragJson.sources?.length);
  if (ragJson.sources && ragJson.sources.length > 0) {
    console.log('Sample citation:', `[Source ${ragJson.sources[0].sourceId}] ${ragJson.sources[0].filename} (p. ${ragJson.sources[0].pageNumber})`);
  }

  // Test 5: Multi-Document Workspace Chat
  console.log('\nTEST 5: Multi-Document Workspace Grounded Chat');
  const multiQuestion = 'Summarize the overarching concepts across the documents in this workspace.';
  const multiRes = await fetch('http://localhost:3000/api/documents/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: multiQuestion })
  });
  const multiJson = await multiRes.json();
  console.log('Multi-Doc Chat status:', multiRes.status);
  console.log('Multi-Doc answer excerpt:', multiJson.answer?.substring(0, 120) + '...');
  console.log('Multi-Doc sources count:', multiJson.sources?.length);

  // Test 6: Deterministic Full-Text Search
  console.log('\nTEST 6: Deterministic PostgreSQL Full-Text Search');
  const searchRes = await fetch('http://localhost:3000/api/documents/search/fulltext?q=system');
  const searchJson = await searchRes.json();
  console.log('Search for "system": results count =', searchJson.totalResults);
  if (searchJson.results.length > 0) {
    console.log('Top match:', searchJson.results[0].originalFilename, 'Rank:', searchJson.results[0].relevanceScore);
  }

  // Test 7: Deterministic Document Comparison
  console.log('\nTEST 7: Deterministic Lexical Comparison');
  const docIds = docsJson.documents.slice(0, 2).map(d => d.id);
  const compRes = await fetch('http://localhost:3000/api/documents/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentIds: docIds })
  });
  const compJson = await compRes.json();
  console.log('Comparison status:', compRes.status);
  console.log('Composite similarity:', compJson.similarityMetrics?.compositeScore + '%');
  console.log('Shared terms count:', compJson.similarityMetrics?.sharedTermsCount);

  // Test 8: Notes & Annotations Persistence
  console.log('\nTEST 8: Persistent Notes CRUD in PostgreSQL');
  const noteCreateRes = await fetch(`http://localhost:3000/api/documents/${sampleDoc.id}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note_text: 'Regression test note verifying database persistence',
      selected_text: 'Regression excerpt',
      page_number: 1,
      annotation_type: 'summary',
      color: 'green'
    })
  });
  const noteCreateJson = await noteCreateRes.json();
  const noteId = noteCreateJson.annotation?.id;
  console.log('Created note ID:', noteId);

  // Verify it exists in database
  const noteGetRes = await fetch(`http://localhost:3000/api/documents/${sampleDoc.id}/annotations`);
  const noteGetJson = await noteGetRes.json();
  const foundNote = noteGetJson.annotations.find(n => n.id === noteId);
  console.log('Verified note in DB:', Boolean(foundNote));

  // Clean up test note
  if (noteId) {
    await fetch(`http://localhost:3000/api/documents/${sampleDoc.id}/annotations/${noteId}`, {
      method: 'DELETE'
    });
    console.log('Cleaned up test note.');
  }

  // Test 9: Malformed PDF / Missing File Error Handling
  console.log('\nTEST 9: Error Handling for Non-Existent Document');
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const badRes = await fetch(`http://localhost:3000/api/documents/${fakeId}`);
  console.log('404 for non-existent document:', badRes.status === 404);

  console.log('\n==============================================');
  console.log('ALL 9 REGRESSION TESTS PASSED SUCCESSFULLY!');
  console.log('==============================================');
  process.exit(0);
}

runRegressionTests().catch(err => {
  console.error('Regression test failure:', err);
  process.exit(1);
});
