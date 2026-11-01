const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { extractTextFromPdf } = require('../../../ai-service');
const { isValidUuid } = require('./documentController');

/**
 * Calculates SHA-256 hash of a file on disk.
 * @param {string} filePath 
 * @returns {string} Hex encoded sha256
 */
function computeFileSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * GET /api/documents/:id/versions
 * Retrieves complete version history for a document.
 */
async function getDocumentVersions(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const versionsResult = await db.query(`
      SELECT 
        id,
        document_id,
        version_number,
        original_filename,
        stored_filename,
        file_size,
        file_sha256,
        created_at,
        (extracted_text IS NOT NULL AND length(extracted_text) > 0) AS has_text
      FROM document_versions
      WHERE document_id = $1
      ORDER BY version_number DESC;
    `, [documentId]);

    // Current document info
    const doc = docResult.rows[0];

    return res.status(200).json({
      documentId,
      currentFilename: doc.original_filename,
      currentSha256: doc.file_sha256,
      currentStatus: doc.status,
      totalVersions: versionsResult.rows.length,
      versions: versionsResult.rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/:id/versions
 * Uploads a new version of an existing document.
 * Preserves historical records, increments version_number, updates documents table,
 * and clears stale analysis & RAG chunks to guarantee consistency.
 */
async function uploadDocumentVersion(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file was uploaded for new version.' });
  }

  const { originalname, filename, path: filePath, size } = req.file;

  try {
    const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
    if (docResult.rows.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(404).json({ error: 'Document not found.' });
    }

    const currentDoc = docResult.rows[0];

    // Compute SHA-256 of new version
    const newFileSha256 = computeFileSha256(filePath);

    // Extract text from new PDF
    let newExtractedText = null;
    try {
      const extraction = await extractTextFromPdf(filePath);
      newExtractedText = extraction.text;
    } catch (parseErr) {
      console.warn('Text extraction warning for new version:', parseErr.message);
    }

    // Determine latest version number
    const maxVersionResult = await db.query(`
      SELECT COALESCE(MAX(version_number), 0) AS max_v 
      FROM document_versions 
      WHERE document_id = $1;
    `, [documentId]);

    let maxVersion = parseInt(maxVersionResult.rows[0].max_v, 10);

    // If no versions recorded yet, record current document as version 1 first
    if (maxVersion === 0) {
      const currentHash = currentDoc.file_sha256 || (fs.existsSync(currentDoc.file_path) ? computeFileSha256(currentDoc.file_path) : null);
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
        documentId,
        currentDoc.original_filename,
        currentDoc.stored_filename,
        currentDoc.file_path,
        currentDoc.file_size,
        currentHash,
        currentDoc.extracted_text,
        currentDoc.created_at || new Date()
      ]);
      maxVersion = 1;
    }

    const nextVersionNumber = maxVersion + 1;

    // Begin transaction for version upload
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert new version into document_versions
      const versionInsertResult = await client.query(`
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *;
      `, [
        documentId,
        nextVersionNumber,
        originalname,
        filename,
        filePath,
        size,
        newFileSha256,
        newExtractedText
      ]);

      // 2. Update current active document record
      const updateDocResult = await client.query(`
        UPDATE documents
        SET 
          original_filename = $1,
          stored_filename = $2,
          file_path = $3,
          file_size = $4,
          file_sha256 = $5,
          extracted_text = $6,
          status = 'uploaded',
          analyzed_at = NULL
        WHERE id = $7
        RETURNING *;
      `, [
        originalname,
        filename,
        filePath,
        size,
        newFileSha256,
        newExtractedText,
        documentId
      ]);

      // 3. Guarantee RAG and Analysis consistency: invalidate stale analysis and chunks
      await client.query('DELETE FROM document_analyses WHERE document_id = $1;', [documentId]);
      await client.query('DELETE FROM document_chunks WHERE document_id = $1;', [documentId]);

      await client.query('COMMIT');

      return res.status(201).json({
        message: `Version ${nextVersionNumber} uploaded successfully. Stale analysis and RAG chunks have been refreshed.`,
        version: versionInsertResult.rows[0],
        document: updateDocResult.rows[0]
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn('Failed to delete version file after error:', cleanupErr.message);
      }
    }
    next(error);
  }
}

/**
 * POST /api/documents/:id/versions/:versionNumber/restore
 * Safely restores an earlier version by creating a new current revision (version N+1).
 * Preserves all audit history and prevents data loss.
 */
async function restoreDocumentVersion(req, res, next) {
  const documentId = req.params.id;
  const versionNumber = parseInt(req.params.versionNumber, 10);

  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  if (isNaN(versionNumber) || versionNumber < 1) {
    return res.status(400).json({ error: 'Valid version number is required.' });
  }

  try {
    // 1. Fetch historical version
    const versionQuery = await db.query(`
      SELECT * FROM document_versions 
      WHERE document_id = $1 AND version_number = $2;
    `, [documentId, versionNumber]);

    if (versionQuery.rows.length === 0) {
      return res.status(404).json({ error: `Version ${versionNumber} not found for this document.` });
    }

    const versionToRestore = versionQuery.rows[0];

    // Check if the physical file still exists
    if (!fs.existsSync(versionToRestore.file_path)) {
      return res.status(400).json({
        error: `Physical file for version ${versionNumber} could not be located on the server.`
      });
    }

    // 2. Determine highest version number to create next version
    const maxVersionResult = await db.query(`
      SELECT MAX(version_number) AS max_v 
      FROM document_versions 
      WHERE document_id = $1;
    `, [documentId]);

    const nextVersionNumber = parseInt(maxVersionResult.rows[0].max_v, 10) + 1;

    // Begin transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 3. Record new version entry (pointing to restored data)
      const newVersionResult = await client.query(`
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *;
      `, [
        documentId,
        nextVersionNumber,
        versionToRestore.original_filename,
        versionToRestore.stored_filename,
        versionToRestore.file_path,
        versionToRestore.file_size,
        versionToRestore.file_sha256,
        versionToRestore.extracted_text
      ]);

      // 4. Update documents table to point to restored version
      const updateDocResult = await client.query(`
        UPDATE documents
        SET 
          original_filename = $1,
          stored_filename = $2,
          file_path = $3,
          file_size = $4,
          file_sha256 = $5,
          extracted_text = $6,
          status = 'uploaded',
          analyzed_at = NULL
        WHERE id = $7
        RETURNING *;
      `, [
        versionToRestore.original_filename,
        versionToRestore.stored_filename,
        versionToRestore.file_path,
        versionToRestore.file_size,
        versionToRestore.file_sha256,
        versionToRestore.extracted_text,
        documentId
      ]);

      // 5. Invalidate stale analysis and chunks
      await client.query('DELETE FROM document_analyses WHERE document_id = $1;', [documentId]);
      await client.query('DELETE FROM document_chunks WHERE document_id = $1;', [documentId]);

      await client.query('COMMIT');

      return res.status(200).json({
        message: `Version ${versionNumber} successfully restored as new revision (Version ${nextVersionNumber}).`,
        restoredFromVersion: versionNumber,
        newVersionNumber: nextVersionNumber,
        document: updateDocResult.rows[0],
        version: newVersionResult.rows[0]
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/check-duplicate
 * Checks if a file hash or uploaded file matches an existing document.
 */
async function checkDuplicate(req, res, next) {
  try {
    let hash = req.body?.sha256;

    if (!hash && req.file) {
      hash = computeFileSha256(req.file.path);
      // clean up temp file if uploaded strictly for check
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }

    if (!hash) {
      return res.status(400).json({ error: 'sha256 hash or file is required for duplicate check.' });
    }

    const matchResult = await db.query(`
      SELECT 
        d.id,
        d.original_filename,
        d.file_size,
        d.status,
        d.created_at,
        d.file_sha256,
        (da.id IS NOT NULL) AS has_analysis
      FROM documents d
      LEFT JOIN document_analyses da ON d.id = da.document_id
      WHERE d.file_sha256 = $1
      LIMIT 1;
    `, [hash]);

    if (matchResult.rows.length > 0) {
      return res.status(200).json({
        isDuplicate: true,
        sha256: hash,
        existingDocument: matchResult.rows[0]
      });
    }

    return res.status(200).json({
      isDuplicate: false,
      sha256: hash
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/:id/versions/:versionNumber/file
 * Streams a historical version PDF file.
 */
async function serveVersionFile(req, res, next) {
  const documentId = req.params.id;
  const versionNumber = parseInt(req.params.versionNumber, 10);

  if (!isValidUuid(documentId) || isNaN(versionNumber) || versionNumber < 1) {
    return res.status(400).json({ error: 'Valid document UUID and version number are required.' });
  }

  try {
    const versionQuery = await db.query(`
      SELECT * FROM document_versions 
      WHERE document_id = $1 AND version_number = $2;
    `, [documentId, versionNumber]);

    if (versionQuery.rows.length === 0) {
      return res.status(404).json({ error: `Version ${versionNumber} not found.` });
    }

    const version = versionQuery.rows[0];
    if (!fs.existsSync(version.file_path)) {
      return res.status(404).json({ error: 'Version PDF file not found on disk.' });
    }

    const stat = fs.statSync(version.file_path);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({ error: 'Requested range not satisfiable' });
      }

      const chunkSize = (end - start) + 1;
      const stream = fs.createReadStream(version.file_path, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(version.original_filename)}"`
      });
      return stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${encodeURIComponent(version.original_filename)}"`
      });
      return fs.createReadStream(version.file_path).pipe(res);
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  computeFileSha256,
  getDocumentVersions,
  uploadDocumentVersion,
  restoreDocumentVersion,
  checkDuplicate,
  serveVersionFile
};
