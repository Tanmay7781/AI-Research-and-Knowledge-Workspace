const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Helper to handle fetch responses and parse errors cleanly.
 */
async function handleResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error || `HTTP Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
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
 * Upload a real PDF document
 * @param {File} file 
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await handleResponse(response);
  return data.document;
}

/**
 * Request document analysis.
 * Backend checks PostgreSQL first; returns existing analysis if present without calling Gemini.
 * @param {string} id 
 */
export async function analyzeDocument(id) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await handleResponse(response);
  return data;
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
 * Semantic search in a document
 * @param {string} id 
 * @param {string} query 
 */
export async function searchDocument(id, query) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/search?q=${encodeURIComponent(query)}`);
  const data = await handleResponse(response);
  return data.results || [];
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
