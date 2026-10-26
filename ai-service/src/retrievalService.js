/**
 * Vector Semantic Retrieval Service
 * Queries PostgreSQL document_chunks using cosine similarity over embeddings.
 */

/**
 * Searches relevant chunks for a specific document or entire workspace.
 * 
 * @param {object} db - Database query interface
 * @param {number[]} queryEmbedding - 768-dimensional query vector
 * @param {object} options
 * @param {string} [options.documentId] - Filter by single document UUID
 * @param {string} [options.workspaceId] - Filter by workspace UUID (multi-document search)
 * @param {number} [options.topK=4] - Max number of relevant chunks to retrieve
 * @param {number} [options.similarityThreshold=0.3] - Minimum similarity score threshold
 * @returns {Promise<Array<{id: string, documentId: string, filename: string, chunkIndex: number, pageNumber: number, content: string, similarity: number}>>}
 */
async function retrieveSimilarChunks(db, queryEmbedding, options = {}) {
  const topK = options.topK || 4;
  const similarityThreshold = options.similarityThreshold !== undefined ? options.similarityThreshold : 0.25;

  let whereClauses = ['c.embedding IS NOT NULL'];
  let params = [];
  let paramIndex = 1;

  // Add embedding array parameter
  const formattedEmbedding = `{${queryEmbedding.join(',')}}`;
  params.push(formattedEmbedding);
  const embeddingParamIdx = `$${paramIndex++}`;

  if (options.documentId) {
    whereClauses.push(`c.document_id = $${paramIndex++}`);
    params.push(options.documentId);
  } else if (options.workspaceId) {
    whereClauses.push(`d.workspace_id = $${paramIndex++}`);
    params.push(options.workspaceId);
  }

  params.push(topK);
  const limitParamIdx = `$${paramIndex++}`;

  const sql = `
    SELECT 
      c.id,
      c.document_id,
      d.original_filename,
      c.chunk_index,
      c.page_number,
      c.content,
      cosine_similarity(c.embedding, ${embeddingParamIdx}::real[]) AS similarity
    FROM document_chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY similarity DESC
    LIMIT ${limitParamIdx};
  `;

  const result = await db.query(sql, params);
  
  // Filter by threshold
  return result.rows
    .map(row => ({
      id: row.id,
      documentId: row.document_id,
      filename: row.original_filename,
      chunkIndex: row.chunk_index,
      pageNumber: row.page_number,
      content: row.content,
      similarity: parseFloat(row.similarity)
    }))
    .filter(row => !isNaN(row.similarity) && row.similarity >= similarityThreshold);
}

module.exports = {
  retrieveSimilarChunks
};
