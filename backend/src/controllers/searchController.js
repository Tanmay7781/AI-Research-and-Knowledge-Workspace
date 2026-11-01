const db = require('../db');
const { isValidUuid } = require('./documentController');

/**
 * GET /api/documents/search/fulltext?q=...&workspaceId=...
 * Executes deterministic full-text search across documents using PostgreSQL's native
 * tsvector, plainto_tsquery, ts_rank, and ts_headline snippet generator.
 * Does NOT invoke Gemini or use AI quota.
 */
async function fullTextSearch(req, res, next) {
  try {
    const queryText = req.query.q ? String(req.query.q).trim() : '';
    const workspaceId = req.query.workspaceId;

    if (!queryText) {
      return res.status(200).json({
        query: '',
        totalResults: 0,
        results: []
      });
    }

    const params = [queryText, `%${queryText}%`];
    let workspaceFilter = '';

    if (isValidUuid(workspaceId)) {
      params.push(workspaceId);
      workspaceFilter = `AND d.workspace_id = $${params.length}`;
    }

    const sql = `
      SELECT 
        d.id,
        d.workspace_id,
        d.original_filename,
        d.file_size,
        d.status,
        d.created_at,
        d.analyzed_at,
        d.file_sha256,
        (da.id IS NOT NULL) AS has_analysis,
        COALESCE(ts_rank_cd(d.search_vector, plainto_tsquery('english', $1)), 0.0) AS rank,
        ts_headline(
          'english', 
          COALESCE(d.extracted_text, ''), 
          plainto_tsquery('english', $1), 
          'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, ShortWord=3, MaxFragments=3, FragmentDelimiter=" ... "'
        ) AS snippet
      FROM documents d
      LEFT JOIN document_analyses da ON d.id = da.document_id
      WHERE (
        d.search_vector @@ plainto_tsquery('english', $1)
        OR d.original_filename ILIKE $2
      )
      ${workspaceFilter}
      ORDER BY rank DESC, d.created_at DESC
      LIMIT 50;
    `;

    const result = await db.query(sql, params);

    // Format results with human-readable snippet fallback if snippet is empty
    const formatted = result.rows.map((row) => {
      let snippet = row.snippet;
      if (!snippet || snippet.trim().length === 0) {
        snippet = `Document matched by title "${row.original_filename}".`;
      }
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        originalFilename: row.original_filename,
        fileSize: row.file_size,
        status: row.status,
        createdAt: row.created_at,
        analyzedAt: row.analyzed_at,
        hasAnalysis: row.has_analysis,
        fileSha256: row.file_sha256,
        relevanceScore: parseFloat(row.rank.toFixed(4)),
        snippet
      };
    });

    return res.status(200).json({
      query: queryText,
      totalResults: formatted.length,
      results: formatted
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  fullTextSearch
};
