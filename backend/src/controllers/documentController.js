const path = require('path');
const fs = require('fs');
const db = require('../db');
const { extractTextFromPdf, generateAnalysisFromText } = require('../../../ai-service');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a given string is a valid UUID.
 * Prevents PostgreSQL type mismatch errors (e.g. integer vs UUID).
 * @param {string} id 
 * @returns {boolean}
 */
function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

/**
 * Ensures file path is absolute and handles missing files gracefully.
 * @param {string} storedFilePath 
 * @param {string} storedFilename 
 * @returns {string} Resolved absolute path
 */
function resolveFilePath(storedFilePath, storedFilename) {
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (storedFilename) {
    const safeFilename = path.basename(storedFilename);
    const candidate = path.join(uploadsDir, safeFilename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  if (storedFilePath) {
    const safeBase = path.basename(storedFilePath);
    const candidate = path.join(uploadsDir, safeBase);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (fs.existsSync(storedFilePath)) {
      return storedFilePath;
    }
  }
  return null;
}

/**
 * Resolves or creates a default workspace UUID.
 * Reuses the existing workspace from PostgreSQL and avoids creating redundant ones.
 * @returns {Promise<string|null>}
 */
async function getDefaultWorkspaceId() {
  try {
    const checkTable = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'workspaces';
    `);

    if (checkTable.rows.length === 0) {
      return null;
    }

    // Check if any workspace exists
    const existingWs = await db.query('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1;');
    if (existingWs.rows.length > 0) {
      return existingWs.rows[0].id;
    }

    // If workspaces exists but is empty, create a default workspace
    const newWs = await db.query(`
      INSERT INTO workspaces (name) VALUES ('Default Workspace') RETURNING id;
    `);
    return newWs.rows[0].id;
  } catch (err) {
    console.warn('Could not resolve default workspace UUID:', err.message);
    return null;
  }
}

/**
 * POST /api/documents/upload
 * Validates, saves file metadata to PostgreSQL, extracts initial text, and returns document record.
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file was uploaded.' });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    const workspaceId = await getDefaultWorkspaceId();

    // Compute SHA-256 hash using actual file bytes
    let fileSha256 = null;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      fileSha256 = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');
    } catch (hashErr) {
      console.warn('Could not compute SHA-256 for uploaded file:', hashErr.message);
    }

    // Check for exact duplicate unless force flag is provided
    const isForce = req.body?.force === 'true' || req.body?.force === true || req.query?.force === 'true';
    if (fileSha256 && !isForce) {
      const duplicateCheck = await db.query(`
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
      `, [fileSha256]);

      if (duplicateCheck.rows.length > 0) {
        // Clean up newly uploaded duplicate file to save disk space
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }

        return res.status(409).json({
          isDuplicate: true,
          message: `An exact duplicate of this file already exists as "${duplicateCheck.rows[0].original_filename}".`,
          existingDocument: duplicateCheck.rows[0]
        });
      }
    }

    // Extract text from the PDF immediately upon upload
    let initialExtractedText = null;
    try {
      const extraction = await extractTextFromPdf(filePath);
      initialExtractedText = extraction.text;
    } catch (parseErr) {
      console.warn('Initial text extraction warning (will be retried during analysis):', parseErr.message);
    }

    const insertSql = `
      INSERT INTO documents (
        workspace_id,
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type,
        extracted_text,
        status,
        file_sha256
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      workspaceId,
      originalname,
      filename,
      filePath,
      size,
      mimetype || 'application/pdf',
      initialExtractedText,
      'uploaded',
      fileSha256
    ];

    const result = await db.query(insertSql, values);
    const document = result.rows[0];

    // Seed initial version 1 in document_versions table
    try {
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
        ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (document_id, version_number) DO NOTHING;
      `, [
        document.id,
        originalname,
        filename,
        filePath,
        size,
        fileSha256,
        initialExtractedText
      ]);
    } catch (vErr) {
      console.warn('Could not seed version 1 for new document:', vErr.message);
    }

    return res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    // Clean up uploaded file if database insert failed
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to delete uploaded file after DB error:', cleanupError.message);
      }
    }
    next(error);
  }
}

/**
 * GET /api/documents
 * Retrieves all uploaded documents ordered by creation date descending.
 * Uses analyzed_at and created_at without referencing non-existent updated_at.
 */
async function getDocuments(req, res, next) {
  try {
    const result = await db.query(`
      SELECT 
        d.id,
        d.workspace_id,
        d.original_filename,
        d.stored_filename,
        d.file_size,
        d.file_sha256,
        d.mime_type,
        d.status,
        d.created_at,
        d.analyzed_at,
        (da.id IS NOT NULL) AS has_analysis
      FROM documents d
      LEFT JOIN document_analyses da ON d.id = da.document_id
      ORDER BY d.created_at DESC;
    `);

    return res.status(200).json({
      documents: result.rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/:id
 * Retrieves document by UUID and includes its analysis if present.
 */
async function getDocumentById(req, res, next) {
  try {
    const documentId = req.params.id;
    if (!isValidUuid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
    }

    const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = docResult.rows[0];

    // Fetch existing analysis if present
    const analysisResult = await db.query(
      'SELECT * FROM document_analyses WHERE document_id = $1;',
      [documentId]
    );

    document.analysis = analysisResult.rows.length > 0 ? analysisResult.rows[0] : null;

    return res.status(200).json({
      document
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/:id/analyze
 * 
 * STRICT DUPLICATE-ANALYSIS PROTECTION:
 * 1. Validates document UUID.
 * 2. Checks PostgreSQL for an existing analysis.
 * 3. If analysis exists: Returns it immediately. NEVER calls Gemini.
 * 4. If no analysis exists: Validates API key, extracts text, calls Gemini, validates, persists to PostgreSQL.
 */
async function analyzeDocument(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    // 1. Find document
    const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = docResult.rows[0];

    // 2. Check if analysis already exists in PostgreSQL (unless force retry is requested)
    const isForceRetry = req.query.force === 'true' || req.body?.force === true;
    const existingAnalysisResult = await db.query(
      'SELECT * FROM document_analyses WHERE document_id = $1;',
      [documentId]
    );

    if (existingAnalysisResult.rows.length > 0 && !isForceRetry) {
      console.log(`[DUPLICATE PROTECTION] Existing analysis found for document ${documentId}. Returning stored analysis without calling Gemini.`);
      
      // Ensure document status is set to analyzed if it wasn't already (without referencing non-existent updated_at)
      if (document.status !== 'analyzed') {
        await db.query("UPDATE documents SET status = 'analyzed', analyzed_at = COALESCE(analyzed_at, CURRENT_TIMESTAMP) WHERE id = $1;", [documentId]);
      }

      return res.status(200).json({
        message: 'Analysis already exists for this document.',
        cached: true,
        analysis: existingAnalysisResult.rows[0]
      });
    }

    // 3. Verify GEMINI_API_KEY is configured before proceeding
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in .env. Please set a valid Gemini API key in your root .env file to enable AI analysis.'
      });
    }

    // 4. Obtain extracted text (reuse or extract)
    let extractedText = document.extracted_text;

    if (!extractedText || extractedText.trim().length === 0) {
      const resolvedPath = resolveFilePath(document.file_path, document.stored_filename);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({
          error: 'The PDF file cannot be located on the server filesystem to perform text extraction.'
        });
      }

      try {
        const extraction = await extractTextFromPdf(resolvedPath);
        extractedText = extraction.text;

        // Save extracted text to database
        await db.query(
          'UPDATE documents SET extracted_text = $1, status = $2 WHERE id = $3;',
          [extractedText, 'processing', documentId]
        );
      } catch (extractError) {
        await db.query("UPDATE documents SET status = 'failed' WHERE id = $1;", [documentId]);
        return res.status(400).json({
          error: extractError.message
        });
      }
    } else {
      // Update status to processing
      await db.query("UPDATE documents SET status = 'processing' WHERE id = $1;", [documentId]);
    }

    // 5. Generate AI analysis using Gemini via ai-service
    console.log(`Sending extracted text (${extractedText.length} characters) for document ${documentId} to Gemini API...`);

    let analysisData;
    try {
      analysisData = await generateAnalysisFromText(extractedText);
    } catch (aiError) {
      // Set status to failed upon Gemini error and allow user to retry
      await db.query("UPDATE documents SET status = 'failed' WHERE id = $1;", [documentId]);
      console.error(`Gemini analysis generation failed for document ${documentId}:`, aiError.message);
      return res.status(502).json({
        error: `AI analysis generation failed: ${aiError.message}`
      });
    }

    // 6. Insert analysis record into PostgreSQL
    const modelUsed = analysisData.modelName || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const insertAnalysisSql = `
      INSERT INTO document_analyses (
        document_id,
        summary,
        key_points,
        flashcards,
        quiz_questions,
        important_terms,
        model_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (document_id) DO UPDATE SET
        summary = EXCLUDED.summary,
        key_points = EXCLUDED.key_points,
        flashcards = EXCLUDED.flashcards,
        quiz_questions = EXCLUDED.quiz_questions,
        important_terms = EXCLUDED.important_terms,
        model_name = EXCLUDED.model_name,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const analysisValues = [
      documentId,
      analysisData.summary,
      JSON.stringify(analysisData.key_points),
      JSON.stringify(analysisData.flashcards),
      JSON.stringify(analysisData.quiz_questions),
      JSON.stringify(analysisData.important_terms),
      modelUsed
    ];

    const savedAnalysisResult = await db.query(insertAnalysisSql, analysisValues);
    const savedAnalysis = savedAnalysisResult.rows[0];

    // 7. Update document status to analyzed and set analyzed_at
    await db.query(
      "UPDATE documents SET status = 'analyzed', analyzed_at = CURRENT_TIMESTAMP WHERE id = $1;",
      [documentId]
    );

    console.log(`Document ${documentId} successfully analyzed and saved to PostgreSQL.`);

    return res.status(200).json({
      message: 'Document analyzed successfully',
      cached: false,
      analysis: savedAnalysis
    });

  } catch (error) {
    // Ensure document is not stuck in 'processing' status
    try {
      await db.query("UPDATE documents SET status = 'failed' WHERE id = $1;", [documentId]);
    } catch (dbError) {
      console.error('Failed to update status to failed:', dbError.message);
    }
    next(error);
  }
}

/**
 * DELETE /api/documents/:id
 * Deletes document record, associated analysis, chunks, and local file safely.
 */
async function deleteDocument(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = docResult.rows[0];

    // 1. Delete associated analysis
    await db.query('DELETE FROM document_analyses WHERE document_id = $1;', [documentId]);

    // 2. Delete associated chunks if chunks table exists
    try {
      await db.query('DELETE FROM document_chunks WHERE document_id = $1;', [documentId]);
    } catch (chunkErr) {
      // Table may not exist yet in earlier phases
    }

    // 3. Delete document record
    await db.query('DELETE FROM documents WHERE id = $1;', [documentId]);

    // 4. Delete local physical file if it exists
    const resolvedPath = resolveFilePath(document.file_path, document.stored_filename);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      try {
        fs.unlinkSync(resolvedPath);
        console.log(`Deleted local file: ${resolvedPath}`);
      } catch (unlinkErr) {
        console.warn('Could not delete local file:', unlinkErr.message);
      }
    }

    return res.status(200).json({
      message: 'Document and its associated data were deleted successfully.',
      id: documentId
    });
  } catch (error) {
    next(error);
  }
}

/**
/**
 * GET /api/documents/:id/file
 * Streams the original PDF binary directly with proper inline headers for in-browser PDF viewers.
 * Supports HTTP byte range requests (Range, 206 Partial Content, Content-Range, Accept-Ranges).
 */
async function serveDocumentFile(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    const docResult = await db.query(
      'SELECT file_path, stored_filename, original_filename, mime_type, file_size FROM documents WHERE id = $1;',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = docResult.rows[0];
    const resolvedPath = resolveFilePath(doc.file_path, doc.stored_filename);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'PDF file not found on disk.' });
    }

    // Support explicit download query flag
    if (req.query.download === 'true') {
      return res.download(resolvedPath, doc.original_filename);
    }

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({ error: 'Requested range not satisfiable' });
      }

      const chunkSize = (end - start) + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      const stream = fs.createReadStream(resolvedPath, { start, end });
      stream.on('error', (streamErr) => {
        if (!res.headersSent) next(streamErr);
      });
      return stream.pipe(res);
    } else {
      res.status(200);
      res.setHeader('Content-Length', fileSize);
      const stream = fs.createReadStream(resolvedPath);
      stream.on('error', (streamErr) => {
        if (!res.headersSent) next(streamErr);
      });
      return stream.pipe(res);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/:id/download
 * Dedicated download endpoint that forces Content-Disposition: attachment for downloads.
 */
async function downloadDocumentFile(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    const docResult = await db.query(
      'SELECT file_path, stored_filename, original_filename FROM documents WHERE id = $1;',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = docResult.rows[0];
    const resolvedPath = resolveFilePath(doc.file_path, doc.stored_filename);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'PDF file not found on disk.' });
    }

    return res.download(resolvedPath, doc.original_filename);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  isValidUuid,
  resolveFilePath,
  getDefaultWorkspaceId,
  uploadDocument,
  getDocuments,
  getDocumentById,
  analyzeDocument,
  deleteDocument,
  serveDocumentFile,
  downloadDocumentFile
};


