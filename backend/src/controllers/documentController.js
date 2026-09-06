const path = require('path');
const fs = require('fs');
const db = require('../db');
const { extractTextFromPdf, generateAnalysisFromText } = require('../../../ai-service');

/**
 * Ensures file path is absolute and handles missing files gracefully.
 * @param {string} storedFilePath 
 * @param {string} storedFilename 
 * @returns {string} Resolved absolute path
 */
function resolveFilePath(storedFilePath, storedFilename) {
  if (storedFilePath && fs.existsSync(storedFilePath)) {
    return storedFilePath;
  }
  // Try relative to backend uploads directory
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (storedFilename) {
    const candidate = path.join(uploadsDir, storedFilename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return storedFilePath;
}

/**
 * Resolves or creates a default workspace if required by database constraints.
 */
async function getDefaultWorkspaceId() {
  try {
    // Check if workspaces table exists
    const checkTable = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'workspaces';
    `);

    if (checkTable.rows.length === 0) {
      return null;
    }

    // Check if any workspace exists
    const existingWs = await db.query('SELECT id FROM workspaces LIMIT 1;');
    if (existingWs.rows.length > 0) {
      return existingWs.rows[0].id;
    }

    // If workspaces exists but is empty, create a default one
    const newWs = await db.query(`
      INSERT INTO workspaces (name) VALUES ('Default Workspace') RETURNING id;
    `);
    return newWs.rows[0].id;
  } catch (err) {
    // If workspaces table does not exist or fails, return null
    return null;
  }
}

/**
 * POST /api/documents/upload
 * Validates, saves file metadata to PostgreSQL, and returns document record.
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file was uploaded.' });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    const workspaceId = await getDefaultWorkspaceId();

    const insertSql = `
      INSERT INTO documents (
        workspace_id,
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      workspaceId,
      originalname,
      filename,
      filePath,
      size,
      mimetype || 'application/pdf',
      'uploaded'
    ];

    const result = await db.query(insertSql, values);
    const document = result.rows[0];

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
        d.mime_type,
        d.status,
        d.created_at,
        d.updated_at,
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
 * Retrieves document by ID and includes its analysis if present.
 */
async function getDocumentById(req, res, next) {
  try {
    const documentId = parseInt(req.params.id, 10);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format.' });
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
 * 1. Checks PostgreSQL for an existing analysis.
 * 2. If analysis exists: Returns it immediately. NEVER calls Gemini.
 * 3. If no analysis exists: Extracts text, calls Gemini, validates, persists to PostgreSQL.
 */
async function analyzeDocument(req, res, next) {
  const documentId = parseInt(req.params.id, 10);
  if (isNaN(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format.' });
  }

  try {
    // 1. Find document
    const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = docResult.rows[0];

    // 2. Check if analysis already exists in PostgreSQL
    const existingAnalysisResult = await db.query(
      'SELECT * FROM document_analyses WHERE document_id = $1;',
      [documentId]
    );

    if (existingAnalysisResult.rows.length > 0) {
      console.log(`[DUPLICATE PROTECTION] Existing analysis found for document ${documentId}. Returning stored analysis without calling Gemini.`);
      
      // Ensure document status is set to analyzed if it wasn't already
      if (document.status !== 'analyzed') {
        await db.query("UPDATE documents SET status = 'analyzed', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [documentId]);
      }

      return res.status(200).json({
        message: 'Analysis already exists for this document.',
        cached: true,
        analysis: existingAnalysisResult.rows[0]
      });
    }

    // 3. If no analysis exists, obtain extracted text (reuse or extract)
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
          'UPDATE documents SET extracted_text = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3;',
          [extractedText, 'processing', documentId]
        );
      } catch (extractError) {
        await db.query("UPDATE documents SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [documentId]);
        return res.status(400).json({
          error: extractError.message
        });
      }
    } else {
      // Update status to processing
      await db.query("UPDATE documents SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [documentId]);
    }

    // 4. Generate AI analysis using Gemini via ai-service
    console.log(`Sending extracted text (${extractedText.length} characters) for document ${documentId} to Gemini API...`);

    let analysisData;
    try {
      analysisData = await generateAnalysisFromText(extractedText);
    } catch (aiError) {
      // Set status to failed upon Gemini error and allow user to retry
      await db.query("UPDATE documents SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [documentId]);
      console.error(`Gemini analysis generation failed for document ${documentId}:`, aiError.message);
      return res.status(502).json({
        error: `AI analysis generation failed: ${aiError.message}`
      });
    }

    // 5. Insert analysis record into PostgreSQL
    const insertAnalysisSql = `
      INSERT INTO document_analyses (
        document_id,
        summary,
        key_points,
        flashcards,
        quiz_questions,
        important_terms
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const analysisValues = [
      documentId,
      analysisData.summary,
      JSON.stringify(analysisData.key_points),
      JSON.stringify(analysisData.flashcards),
      JSON.stringify(analysisData.quiz_questions),
      JSON.stringify(analysisData.important_terms)
    ];

    const savedAnalysisResult = await db.query(insertAnalysisSql, analysisValues);
    const savedAnalysis = savedAnalysisResult.rows[0];

    // 6. Update document status to analyzed
    await db.query(
      "UPDATE documents SET status = 'analyzed', updated_at = CURRENT_TIMESTAMP WHERE id = $1;",
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
      await db.query("UPDATE documents SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [documentId]);
    } catch (dbError) {
      console.error('Failed to update status to failed:', dbError.message);
    }
    next(error);
  }
}

/**
 * DELETE /api/documents/:id
 * Deletes document record, associated analysis, and local file.
 */
async function deleteDocument(req, res, next) {
  const documentId = parseInt(req.params.id, 10);
  if (isNaN(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format.' });
  }

  try {
    const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = docResult.rows[0];

    // 1. Delete associated analysis explicitly (in case ON DELETE CASCADE is omitted in user's DB)
    await db.query('DELETE FROM document_analyses WHERE document_id = $1;', [documentId]);

    // 2. Delete document record
    await db.query('DELETE FROM documents WHERE id = $1;', [documentId]);

    // 3. Delete local physical file if it exists
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
      message: 'Document and its analysis were deleted successfully.',
      id: documentId
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  analyzeDocument,
  deleteDocument
};
