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
 * Fetch single document by ID (includes analysis if available)
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
 * @param {number|string} id 
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
 * Delete document and cascade delete its analysis
 * @param {number|string} id 
 */
export async function deleteDocument(id) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE'
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
