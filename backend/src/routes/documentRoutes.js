const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  analyzeDocument,
  deleteDocument
} = require('../controllers/documentController');

// Upload a PDF document
router.post('/upload', upload.single('file'), uploadDocument);

// Get all documents
router.get('/', getDocuments);

// Get a single document with analysis
router.get('/:id', getDocumentById);

// Analyze a document with duplicate protection
router.post('/:id/analyze', analyzeDocument);

// Delete a document and its analysis
router.delete('/:id', deleteDocument);

module.exports = router;
