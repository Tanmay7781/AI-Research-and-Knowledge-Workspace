const express = require('express');
const router = express.Router();
const db = require('../db');
const { chatWithWorkspace } = require('../controllers/ragController');

// GET /api/workspaces - List workspaces
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        w.id,
        w.name,
        w.created_at,
        COUNT(d.id)::int AS document_count
      FROM workspaces w
      LEFT JOIN documents d ON w.id = d.workspace_id
      GROUP BY w.id, w.name, w.created_at
      ORDER BY w.created_at ASC;
    `);
    return res.status(200).json({ workspaces: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:workspaceId/chat - Chat across documents in this workspace
router.post('/:workspaceId/chat', (req, res, next) => {
  req.body.workspaceId = req.params.workspaceId;
  return chatWithWorkspace(req, res, next);
});

module.exports = router;
