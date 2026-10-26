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
const {
  processDocumentRAG,
  chatWithDocument,
  chatWithWorkspace,
  getDocumentChunks,
  searchDocumentChunks
} = require('../controllers/ragController');

// Upload a PDF document
router.post('/upload', upload.single('file'), uploadDocument);

// Get all documents
router.get('/', getDocuments);

// Multi-document grounded chat across the workspace
router.post('/chat', chatWithWorkspace);

// Get a single document with analysis
router.get('/:id', getDocumentById);

// Analyze a document with duplicate protection
router.post('/:id/analyze', analyzeDocument);

// Delete a document and its analysis
router.delete('/:id', deleteDocument);

// RAG: Process chunks and embeddings for a document
router.post('/:id/process-rag', processDocumentRAG);

// RAG: Chat with a single document using vector similarity
router.post('/:id/chat', chatWithDocument);

// RAG: Retrieve chunks for a document
router.get('/:id/chunks', getDocumentChunks);

// RAG: Semantic search within a document
router.get('/:id/search', searchDocumentChunks);

module.exports = router;
