const path = require('path');
const fs = require('fs');
const db = require('../db');
const {
  extractTextFromPdf,
  chunkDocumentPages,
  generateEmbedding,
  generateBatchEmbeddings,
  retrieveSimilarChunks,
  generateRAGAnswer
} = require('../../../ai-service');
const { isValidUuid } = require('./documentController');

/**
 * Resolves local file path safely.
 */
function resolveFilePath(storedFilePath, storedFilename) {
  if (storedFilePath && fs.existsSync(storedFilePath)) {
    return storedFilePath;
  }
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
 * Ensures a document is chunked and embedded in PostgreSQL.
 * If already processed, reuses existing chunks without repeating embedding API calls.
 * 
 * @param {string} documentId 
 * @returns {Promise<{chunksCount: number, cached: boolean}>}
 */
async function ensureDocumentChunks(documentId) {
  // Check if chunks already exist
  const existingCheck = await db.query(
    'SELECT COUNT(*)::int as count FROM document_chunks WHERE document_id = $1 AND embedding IS NOT NULL;',
    [documentId]
  );
  const existingCount = existingCheck.rows[0].count;

  if (existingCount > 0) {
    return { chunksCount: existingCount, cached: true };
  }

  // Fetch document details
  const docResult = await db.query('SELECT * FROM documents WHERE id = $1;', [documentId]);
  if (docResult.rows.length === 0) {
    throw new Error('Document not found.');
  }

  const document = docResult.rows[0];
  const resolvedPath = resolveFilePath(document.file_path, document.stored_filename);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error('PDF file could not be found on server storage to process chunks.');
  }

  // Extract page-by-page text
  const extraction = await extractTextFromPdf(resolvedPath);
  const pages = extraction.pages;

  // Chunk text preserving accurate page numbers
  const chunks = chunkDocumentPages(pages);
  if (chunks.length === 0) {
    throw new Error('No chunkable content found in PDF document.');
  }

  // Generate embeddings for each chunk
  console.log(`Generating embeddings for ${chunks.length} chunks of document "${document.original_filename}"...`);
  const chunkTexts = chunks.map(c => c.content);
  const embeddings = await generateBatchEmbeddings(chunkTexts);

  // Clear any partial un-embedded chunks for this document
  await db.query('DELETE FROM document_chunks WHERE document_id = $1;', [documentId]);

  // Insert chunks with embeddings into PostgreSQL
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embeddingVec = embeddings[i];
    const formattedVec = `{${embeddingVec.join(',')}}`;

    await db.query(
      `INSERT INTO document_chunks (
        document_id,
        chunk_index,
        content,
        page_number,
        embedding
      ) VALUES ($1, $2, $3, $4, $5::real[]);`,
      [documentId, chunk.chunkIndex, chunk.content, chunk.pageNumber, formattedVec]
    );
  }

  console.log(`Successfully stored ${chunks.length} chunks and embeddings in PostgreSQL.`);
  return { chunksCount: chunks.length, cached: false };
}

/**
 * POST /api/documents/:id/process-rag
 * Splits document into chunks, creates embeddings, and stores in PostgreSQL.
 */
async function processDocumentRAG(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    const result = await ensureDocumentChunks(documentId);
    return res.status(200).json({
      message: result.cached
        ? 'Document is already processed for RAG.'
        : 'Document successfully chunked and embedded in PostgreSQL.',
      documentId,
      chunksCount: result.chunksCount,
      cached: result.cached
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/:id/chat
 * Single document grounded RAG Q&A.
 */
async function chatWithDocument(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  const { question } = req.body;
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'A question is required to chat with the document.' });
  }

  try {
    // 1. Ensure document has embeddings ready
    await ensureDocumentChunks(documentId);

    // 2. Generate embedding for user query
    const queryEmbedding = await generateEmbedding(question.trim());

    // 3. Retrieve top relevant chunks for this document
    const relevantChunks = await retrieveSimilarChunks(db, queryEmbedding, {
      documentId,
      topK: 4,
      similarityThreshold: 0.20
    });

    // 4. Generate grounded answer via Gemini
    const ragResponse = await generateRAGAnswer(question.trim(), relevantChunks);

    return res.status(200).json({
      question: question.trim(),
      answer: ragResponse.answer,
      sources: ragResponse.sources,
      hasAnswer: ragResponse.hasAnswer
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/chat (or /api/workspaces/:workspaceId/chat)
 * Multi-document grounded RAG Q&A across the entire workspace.
 */
async function chatWithWorkspace(req, res, next) {
  const { question, workspaceId } = req.body;
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'A question is required to search the workspace.' });
  }

  try {
    // Generate embedding for user query
    const queryEmbedding = await generateEmbedding(question.trim());

    // Retrieve relevant chunks across all workspace documents
    const relevantChunks = await retrieveSimilarChunks(db, queryEmbedding, {
      workspaceId: isValidUuid(workspaceId) ? workspaceId : undefined,
      topK: 6,
      similarityThreshold: 0.20
    });

    // Generate grounded answer via Gemini
    const ragResponse = await generateRAGAnswer(question.trim(), relevantChunks);

    return res.status(200).json({
      question: question.trim(),
      answer: ragResponse.answer,
      sources: ragResponse.sources,
      hasAnswer: ragResponse.hasAnswer
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/:id/chunks
 * Retrieves all chunks for a document (without raw vector blobs) for UI inspection.
 */
async function getDocumentChunks(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    const result = await db.query(`
      SELECT 
        id,
        document_id,
        chunk_index,
        page_number,
        content,
        (embedding IS NOT NULL) AS has_embedding,
        created_at
      FROM document_chunks
      WHERE document_id = $1
      ORDER BY chunk_index ASC;
    `, [documentId]);

    return res.status(200).json({
      documentId,
      totalChunks: result.rows.length,
      chunks: result.rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/:id/search?q=...
 * Semantic search returning matching chunks and similarity scores.
 */
async function searchDocumentChunks(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  const queryText = req.query.q;
  if (!queryText || queryText.trim().length === 0) {
    return res.status(400).json({ error: 'Search query string "q" is required.' });
  }

  try {
    await ensureDocumentChunks(documentId);
    const queryEmbedding = await generateEmbedding(queryText.trim());

    const chunks = await retrieveSimilarChunks(db, queryEmbedding, {
      documentId,
      topK: 5,
      similarityThreshold: 0.15
    });

    return res.status(200).json({
      query: queryText.trim(),
      results: chunks
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processDocumentRAG,
  chatWithDocument,
  chatWithWorkspace,
  getDocumentChunks,
  searchDocumentChunks
};
