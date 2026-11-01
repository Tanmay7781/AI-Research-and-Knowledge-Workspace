const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../src/db');

async function runMigration() {
  console.log('Running safe additive migration...');
  const sql = fs.readFileSync(path.join(__dirname, '001_additive_features.sql'), 'utf-8');
  await db.query(sql);
  console.log('Additive migration applied successfully.');

  // Backfill existing documents: compute SHA-256 and search_vector if missing
  const docs = await db.query('SELECT * FROM documents WHERE file_sha256 IS NULL OR search_vector IS NULL;');
  console.log(`Checking backfill for ${docs.rows.length} documents...`);

  for (const doc of docs.rows) {
    let hash = doc.file_sha256;
    const resolvedPath = fs.existsSync(doc.file_path)
      ? doc.file_path
      : path.join(__dirname, '../uploads', doc.stored_filename);

    if (!hash && fs.existsSync(resolvedPath)) {
      const buffer = fs.readFileSync(resolvedPath);
      hash = crypto.createHash('sha256').update(buffer).digest('hex');
    }

    if (hash) {
      await db.query(`
        UPDATE documents
        SET file_sha256 = $1
        WHERE id = $2;
      `, [hash, doc.id]);
    }

    // Check if initial version exists in document_versions
    const versionCheck = await db.query('SELECT COUNT(*) FROM document_versions WHERE document_id = $1;', [doc.id]);
    if (parseInt(versionCheck.rows[0].count, 10) === 0 && hash) {
      await db.query(`
        INSERT INTO document_versions (
          document_id,
          version_number,
          original_filename,
          stored_filename,
          file_path,
          file_size,
          file_sha256,
          extracted_text,
          created_at
        ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (document_id, version_number) DO NOTHING;
      `, [
        doc.id,
        doc.original_filename,
        doc.stored_filename,
        doc.file_path,
        doc.file_size,
        hash,
        doc.extracted_text,
        doc.created_at || new Date()
      ]);
      console.log(`Seeded version 1 for document "${doc.original_filename}" (${doc.id})`);
    }
  }

  console.log('Migration & backfill completed.');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
