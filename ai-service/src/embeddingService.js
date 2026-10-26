const path = require('path');
const dotenv = require('dotenv');

// Ensure root .env is loaded if not already in process.env
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

const EMBEDDING_MODEL_NAME = 'gemini-embedding-001';
const EXPECTED_DIMENSION = 768;

/**
 * Initializes and retrieves the Google embedding model.
 * Validates API key presence.
 * 
 * @param {string} [modelName]
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getEmbeddingModel(modelName = EMBEDDING_MODEL_NAME) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please set a valid Gemini API key.');
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Generates an embedding vector for a single text string using gemini-embedding-001.
 * Requests exact 768-dimensional float vector matching PostgreSQL schema.
 * 
 * @param {string} text 
 * @returns {Promise<number[]>} 768-dimensional float array
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text.');
  }

  const candidateModels = [EMBEDDING_MODEL_NAME, 'gemini-embedding-2'];
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = getEmbeddingModel(modelName);
      const response = await model.embedContent({
        content: { parts: [{ text: text.trim() }] },
        outputDimensionality: EXPECTED_DIMENSION
      });
      const values = response?.embedding?.values;

      if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Invalid embedding response received from Google Generative AI.');
      }

      return values;
    } catch (err) {
      lastError = err;
      if (candidateModels.indexOf(modelName) < candidateModels.length - 1) {
        continue;
      }
    }
  }

  throw new Error(`Embedding generation failed (${EMBEDDING_MODEL_NAME}): ${lastError?.message || 'Request failed'}`);
}

/**
 * Generates embeddings for an array of chunk contents.
 * Includes concurrency control to avoid hitting API rate limits.
 * 
 * @param {Array<string>} texts 
 * @param {number} concurrency 
 * @returns {Promise<Array<number[]>>}
 */
async function generateBatchEmbeddings(texts, concurrency = 4) {
  const results = new Array(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const slice = texts.slice(i, i + concurrency);
    const promises = slice.map((text, offset) =>
      generateEmbedding(text).then((vec) => {
        results[i + offset] = vec;
      })
    );
    await Promise.all(promises);
  }

  return results;
}

module.exports = {
  EMBEDDING_MODEL_NAME,
  EXPECTED_DIMENSION,
  generateEmbedding,
  generateBatchEmbeddings
};
