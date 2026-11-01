const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');

// Document core controllers
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  analyzeDocument,
  deleteDocument,
  serveDocumentFile,
  downloadDocumentFile
} = require('../controllers/documentController');

// RAG controllers
const {
  processDocumentRAG,
  chatWithDocument,
  chatWithWorkspace,
  getDocumentChunks,
  searchDocumentChunks
} = require('../controllers/ragController');

// Full-Text Search controller (Deterministic PostgreSQL tsvector/tsquery)
const { fullTextSearch } = require('../controllers/searchController');

// Document Comparison controller (Deterministic Jaccard & Cosine)
const { compareDocuments } = require('../controllers/comparisonController');

// Annotations controller (Persistent document notes & highlights)
const {
  getDocumentAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getRevisionAnnotations
} = require('../controllers/annotationController');

// Version & Duplicate management controller
const {
  checkDuplicate,
  getDocumentVersions,
  uploadDocumentVersion,
  restoreDocumentVersion,
  serveVersionFile
} = require('../controllers/versionController');

// =====================================================================
// Top-Level Document & Workspace Endpoints
// =====================================================================

// Check for exact duplicate PDF without persisting
router.post('/check-duplicate', upload.single('file'), checkDuplicate);

// Compare 2 or more documents using deterministic algorithms
router.post('/compare', compareDocuments);

// Full-text search across all documents using native PostgreSQL FTS
router.get('/search/fulltext', fullTextSearch);

// Revision flash-review items across workspace
router.get('/annotations/revision', getRevisionAnnotations);

// Upload a PDF document (includes SHA-256 duplicate detection & version 1 seeding)
router.post('/upload', upload.single('file'), uploadDocument);

// Get all documents
router.get('/', getDocuments);

// Multi-document grounded chat across the workspace
router.post('/chat', chatWithWorkspace);

// =====================================================================
// Document-Specific Endpoints
// =====================================================================

// Get a single document with analysis
router.get('/:id', getDocumentById);

// Stream actual PDF file for in-browser PDF reader
router.get('/:id/file', serveDocumentFile);

// Explicit download endpoint forcing Content-Disposition: attachment
router.get('/:id/download', downloadDocumentFile);

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

// =====================================================================
// Document Annotations & Notes Endpoints
// =====================================================================

// List notes and annotations for a document
router.get('/:id/annotations', getDocumentAnnotations);

// Revision flash-review items for a specific document
router.get('/:id/annotations/revision', getRevisionAnnotations);

// Create a new note/annotation
router.post('/:id/annotations', createAnnotation);

// Update an annotation
router.put('/:id/annotations/:annotationId', updateAnnotation);

// Delete an annotation
router.delete('/:id/annotations/:annotationId', deleteAnnotation);

// =====================================================================
// Document Version Management Endpoints
// =====================================================================

// List all versions of a document
router.get('/:id/versions', getDocumentVersions);

// Stream historical version PDF file
router.get('/:id/versions/:versionNumber/file', serveVersionFile);

// Upload a new version for a document (clears stale chunks & analysis)
router.post('/:id/versions', upload.single('file'), uploadDocumentVersion);

// Restore a historical version as the new current revision
router.post('/:id/versions/:versionNumber/restore', restoreDocumentVersion);

module.exports = router;
