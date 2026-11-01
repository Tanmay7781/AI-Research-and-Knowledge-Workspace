const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Helper to handle fetch responses and parse errors cleanly.
 */
async function handleResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP Error ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Fetch all documents from PostgreSQL
 */
export async function getDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents`);
  const data = await handleResponse(response);
  return data.documents || [];
}

/**
 * Fetch single document by UUID (includes analysis if available)
 */
export async function getDocument(id) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`);
  const data = await handleResponse(response);
  return data.document;
}

/**
 * Upload a real PDF document with SHA-256 duplicate detection
 * @param {File} file 
 * @param {boolean} [force=false]
 */
export async function uploadDocument(file, force = false) {
  const formData = new FormData();
  formData.append('file', file);
  if (force) {
    formData.append('force', 'true');
  }

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await handleResponse(response);
  return data.document;
}

/**
 * Check if a file is an exact duplicate before storing
 * @param {string} sha256 
 */
export async function checkDuplicate(sha256) {
  const response = await fetch(`${API_BASE_URL}/documents/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha256 })
  });

  return await handleResponse(response);
}

/**
 * Request document analysis.
 * Backend checks PostgreSQL first; returns existing analysis if present without calling Gemini.
 * @param {string} id 
 * @param {boolean} [force=false]
 */
export async function analyzeDocument(id, force = false) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ force })
  });

  return await handleResponse(response);
}

/**
 * Delete document and cascade delete its analysis & chunks
 * @param {string} id 
 */
export async function deleteDocument(id) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE'
  });

  return await handleResponse(response);
}

/**
 * Process document text chunking and vector embeddings for RAG
 * @param {string} id 
 */
export async function processDocumentRAG(id) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/process-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return await handleResponse(response);
}

/**
 * Chat with a single document using vector similarity and grounded Gemini Q&A
 * @param {string} id 
 * @param {string} question 
 */
export async function chatWithDocument(id, question) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question })
  });

  return await handleResponse(response);
}

/**
 * Chat across all documents in the workspace
 * @param {string} question 
 * @param {string} [workspaceId] 
 */
export async function chatWithWorkspace(question, workspaceId) {
  const response = await fetch(`${API_BASE_URL}/documents/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question, workspaceId })
  });

  return await handleResponse(response);
}

/**
 * Fetch chunks for a document
 * @param {string} id 
 */
export async function getDocumentChunks(id) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/chunks`);
  const data = await handleResponse(response);
  return data.chunks || [];
}

/**
 * Deterministic PostgreSQL Full-Text Search across filenames and extracted text
 * @param {string} query 
 * @param {string} [workspaceId]
 */
export async function searchFullText(query, workspaceId) {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (workspaceId) params.append('workspaceId', workspaceId);

  const response = await fetch(`${API_BASE_URL}/documents/search/fulltext?${params.toString()}`);
  return await handleResponse(response);
}

/**
 * Compare 2 or more documents using deterministic algorithms (Jaccard, Cosine, shared/unique terms)
 * @param {string[]} documentIds 
 */
export async function compareDocuments(documentIds) {
  const response = await fetch(`${API_BASE_URL}/documents/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ documentIds })
  });

  return await handleResponse(response);
}

/**
 * Fetch all persistent annotations & notes for a document
 * @param {string} documentId 
 * @param {object} [filters] 
 */
export async function getDocumentAnnotations(documentId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.page) params.append('page', filters.page);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/annotations${queryStr}`);
  return await handleResponse(response);
}

/**
 * Create a new note/annotation for a document
 * @param {string} documentId 
 * @param {object} annotationData 
 */
export async function createAnnotation(documentId, annotationData) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(annotationData)
  });

  return await handleResponse(response);
}

/**
 * Update an existing note/annotation
 * @param {string} documentId 
 * @param {string} annotationId 
 * @param {object} updateData 
 */
export async function updateAnnotation(documentId, annotationId, updateData) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/annotations/${annotationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });

  return await handleResponse(response);
}

/**
 * Delete a note/annotation
 * @param {string} documentId 
 * @param {string} annotationId 
 */
export async function deleteAnnotation(documentId, annotationId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/annotations/${annotationId}`, {
    method: 'DELETE'
  });

  return await handleResponse(response);
}

/**
 * Fetch flash revision annotations across all documents or for a specific document
 * @param {string} [documentId]
 */
export async function getRevisionAnnotations(documentId = null) {
  const url = documentId
    ? `${API_BASE_URL}/documents/${documentId}/annotations/revision`
    : `${API_BASE_URL}/documents/annotations/revision`;
  const response = await fetch(url);
  return await handleResponse(response);
}

/**
 * Get the direct streaming URL for a document PDF
 * @param {string} documentId
 */
export function getDocumentFileUrl(documentId) {
  return `${API_BASE_URL}/documents/${documentId}/file`;
}

/**
 * Get dedicated file download URL (Content-Disposition: attachment)
 * @param {string} documentId
 */
export function getDocumentDownloadUrl(documentId) {
  return `${API_BASE_URL}/documents/${documentId}/download`;
}

/**
 * Get the direct streaming URL for a document historical version PDF
 * @param {string} documentId
 * @param {number} versionNumber
 */
export function getVersionFileUrl(documentId, versionNumber) {
  return `${API_BASE_URL}/documents/${documentId}/versions/${versionNumber}/file`;
}

/**
 * Fetch version history for a document
 * @param {string} documentId 
 */
export async function getDocumentVersions(documentId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`);
  return await handleResponse(response);
}

/**
 * Upload a new version for a document
 * @param {string} documentId 
 * @param {File} file 
 */
export async function uploadDocumentVersion(documentId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`, {
    method: 'POST',
    body: formData
  });

  return await handleResponse(response);
}

/**
 * Restore an earlier version as a new current revision
 * @param {string} documentId 
 * @param {number} versionNumber 
 */
export async function restoreDocumentVersion(documentId, versionNumber) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/${versionNumber}/restore`, {
    method: 'POST'
  });

  return await handleResponse(response);
}

/**
 * Backend health check
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await handleResponse(response);
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
