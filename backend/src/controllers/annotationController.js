const db = require('../db');
const { isValidUuid } = require('./documentController');

/**
 * GET /api/documents/:id/annotations
 * Retrieves all persistent notes and annotations for a document.
 */
async function getDocumentAnnotations(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  try {
    const docCheck = await db.query('SELECT id, original_filename FROM documents WHERE id = $1;', [documentId]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const { type, page } = req.query;
    let sql = `
      SELECT 
        id,
        document_id,
        page_number,
        selected_text,
        note_text,
        annotation_type,
        color,
        context_before,
        context_after,
        position,
        created_at,
        updated_at
      FROM document_annotations
      WHERE document_id = $1
    `;
    const params = [documentId];

    if (type) {
      params.push(type);
      sql += ` AND annotation_type = $${params.length}`;
    }

    if (page && !isNaN(parseInt(page, 10))) {
      params.push(parseInt(page, 10));
      sql += ` AND page_number = $${params.length}`;
    }

    sql += ' ORDER BY COALESCE(page_number, 0) ASC, created_at DESC;';

    const result = await db.query(sql, params);

    return res.status(200).json({
      documentId,
      documentName: docCheck.rows[0].original_filename,
      totalAnnotations: result.rows.length,
      annotations: result.rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/:id/annotations
 * Creates a new persistent note or annotation.
 */
async function createAnnotation(req, res, next) {
  const documentId = req.params.id;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid document ID format. Expected a valid UUID.' });
  }

  const {
    note_text,
    selected_text,
    page_number,
    annotation_type = 'note',
    color = 'yellow',
    context_before = null,
    context_after = null,
    position = {}
  } = req.body;

  if (!note_text && !selected_text) {
    return res.status(400).json({ error: 'Either note_text or selected_text must be provided.' });
  }

  try {
    const docCheck = await db.query('SELECT id FROM documents WHERE id = $1;', [documentId]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const parsedPage = page_number ? parseInt(page_number, 10) : null;
    const posObj = typeof position === 'object' && position !== null ? { ...position } : {};
    if (context_before && !posObj.contextBefore) posObj.contextBefore = context_before;
    if (context_after && !posObj.contextAfter) posObj.contextAfter = context_after;
    const posJson = JSON.stringify(posObj);

    const insertSql = `
      INSERT INTO document_annotations (
        document_id,
        page_number,
        selected_text,
        note_text,
        annotation_type,
        color,
        context_before,
        context_after,
        position,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      documentId,
      isNaN(parsedPage) ? null : parsedPage,
      selected_text ? String(selected_text).trim() : null,
      note_text ? String(note_text).trim() : '',
      String(annotation_type || 'note').toLowerCase(),
      String(color || 'yellow'),
      context_before ? String(context_before) : null,
      context_after ? String(context_after) : null,
      posJson
    ];

    const result = await db.query(insertSql, values);

    return res.status(201).json({
      message: 'Annotation created successfully.',
      annotation: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/documents/:id/annotations/:annotationId
 * Updates an existing persistent note or annotation.
 */
async function updateAnnotation(req, res, next) {
  const { id: documentId, annotationId } = req.params;

  if (!isValidUuid(documentId) || !isValidUuid(annotationId)) {
    return res.status(400).json({ error: 'Invalid UUID format for document or annotation.' });
  }

  const {
    note_text,
    selected_text,
    page_number,
    annotation_type,
    color,
    context_before,
    context_after,
    position
  } = req.body;

  try {
    const existing = await db.query(
      'SELECT * FROM document_annotations WHERE id = $1 AND document_id = $2;',
      [annotationId, documentId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found for this document.' });
    }

    const current = existing.rows[0];

    const updatedNoteText = note_text !== undefined ? String(note_text).trim() : current.note_text;
    const updatedSelectedText = selected_text !== undefined ? (selected_text ? String(selected_text).trim() : null) : current.selected_text;
    const updatedPage = page_number !== undefined ? (page_number ? parseInt(page_number, 10) : null) : current.page_number;
    const updatedType = annotation_type !== undefined ? String(annotation_type).toLowerCase() : current.annotation_type;
    const updatedColor = color !== undefined ? String(color) : current.color;
    const updatedCtxBefore = context_before !== undefined ? context_before : current.context_before;
    const updatedCtxAfter = context_after !== undefined ? context_after : current.context_after;
    const updatedPos = position !== undefined ? (typeof position === 'object' ? JSON.stringify(position) : '{}') : JSON.stringify(current.position || {});

    const updateSql = `
      UPDATE document_annotations
      SET 
        note_text = $1,
        selected_text = $2,
        page_number = $3,
        annotation_type = $4,
        color = $5,
        context_before = $6,
        context_after = $7,
        position = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND document_id = $10
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      updatedNoteText,
      updatedSelectedText,
      updatedPage,
      updatedType,
      updatedColor,
      updatedCtxBefore,
      updatedCtxAfter,
      updatedPos,
      annotationId,
      documentId
    ]);

    return res.status(200).json({
      message: 'Annotation updated successfully.',
      annotation: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/documents/:id/annotations/:annotationId
 * Deletes an annotation from PostgreSQL.
 */
async function deleteAnnotation(req, res, next) {
  const { id: documentId, annotationId } = req.params;

  if (!isValidUuid(documentId) || !isValidUuid(annotationId)) {
    return res.status(400).json({ error: 'Invalid UUID format for document or annotation.' });
  }

  try {
    const result = await db.query(
      'DELETE FROM document_annotations WHERE id = $1 AND document_id = $2 RETURNING id;',
      [annotationId, documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found for this document.' });
    }

    return res.status(200).json({
      message: 'Annotation deleted successfully.',
      id: annotationId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/annotations/revision or GET /api/documents/:id/annotations/revision
 * Retrieves all highlight annotations across the workspace or for a specific document,
 * formatted cleanly for step-by-step revision mode.
 */
async function getRevisionAnnotations(req, res, next) {
  try {
    const documentId = req.params.id;
    let sql = `
      SELECT 
        a.id,
        a.document_id,
        d.original_filename AS document_name,
        a.page_number,
        a.selected_text,
        a.note_text,
        a.annotation_type,
        a.color,
        a.context_before,
        a.context_after,
        a.position,
        a.created_at,
        a.updated_at
      FROM document_annotations a
      JOIN documents d ON a.document_id = d.id
      WHERE (a.selected_text IS NOT NULL AND a.selected_text != '')
    `;
    const params = [];
    if (documentId && isValidUuid(documentId)) {
      params.push(documentId);
      sql += ` AND a.document_id = $${params.length}`;
    }
    sql += ` ORDER BY d.original_filename ASC, COALESCE(a.page_number, 0) ASC, a.created_at ASC;`;

    const result = await db.query(sql, params);
    return res.status(200).json({
      total: result.rows.length,
      revisionItems: result.rows
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDocumentAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getRevisionAnnotations
};
