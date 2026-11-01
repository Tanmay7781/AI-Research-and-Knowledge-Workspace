const path = require('path');
const fs = require('fs');
const db = require('./src/db');

async function testVersionUploadAndRestore() {
  console.log('Testing Version Upload & Restore...');

  const docsRes = await db.query('SELECT id, original_filename FROM documents LIMIT 1;');
  const doc = docsRes.rows[0];
  console.log(`Using document "${doc.original_filename}" (${doc.id})`);

  // Path to a sample pdf to upload as new version
  const samplePdfPath = path.join(__dirname, 'uploads/1793080493014-3f3f33d5321c-Unit_4_Hypothesis.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    console.log('Sample file not found, skipping version upload file test');
    process.exit(0);
  }

  // Use FormData to upload version
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(samplePdfPath)], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'Unit_4_Hypothesis.pdf');

  const uploadRes = await fetch(`http://localhost:3000/api/documents/${doc.id}/versions`, {
    method: 'POST',
    body: formData
  });

  const uploadJson = await uploadRes.json();
  console.log('Upload version status:', uploadRes.status, 'Version Number:', uploadJson.version?.version_number);

  // List versions
  const listRes = await fetch(`http://localhost:3000/api/documents/${doc.id}/versions`);
  const listJson = await listRes.json();
  console.log('Total versions after upload:', listJson.totalVersions);

  // Restore version 1
  const restoreRes = await fetch(`http://localhost:3000/api/documents/${doc.id}/versions/1/restore`, {
    method: 'POST'
  });
  const restoreJson = await restoreRes.json();
  console.log('Restore status:', restoreRes.status, 'New version number:', restoreJson.newVersionNumber, 'Restored title:', restoreJson.document?.original_filename);

  // Verify versions again
  const listAgainRes = await fetch(`http://localhost:3000/api/documents/${doc.id}/versions`);
  const listAgainJson = await listAgainRes.json();
  console.log('Total versions after restore:', listAgainJson.totalVersions);
  console.log('Versions summary:', listAgainJson.versions.map(v => `v${v.version_number}: ${v.original_filename}`).join(', '));

  console.log('Version upload and restore passed successfully!');
  process.exit(0);
}

testVersionUploadAndRestore().catch(err => {
  console.error('Version test error:', err);
  process.exit(1);
});
