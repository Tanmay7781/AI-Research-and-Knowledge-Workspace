const path = require('path');
const dotenv = require('dotenv');

// Load .env from root project folder if not already loaded in process.env
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnvPath });

/**
 * Safe configuration check: confirms whether GEMINI_API_KEY is present
 * without displaying or exposing its secret value.
 */
function isGeminiConfigured() {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim().length > 0 && !apiKey.includes('your_gemini_api_key_here'));
}

const { extractTextFromPdf } = require('./pdfService');
const { generateAnalysisFromText } = require('./geminiService');
const { validateAnalysis } = require('./analysisValidator');
const { chunkDocumentPages, splitTextIntoSegments } = require('./chunkService');
const { generateEmbedding, generateBatchEmbeddings, EXPECTED_DIMENSION } = require('./embeddingService');
const { retrieveSimilarChunks } = require('./retrievalService');
const { generateRAGAnswer } = require('./ragService');

module.exports = {
  extractTextFromPdf,
  generateAnalysisFromText,
  validateAnalysis,
  chunkDocumentPages,
  splitTextIntoSegments,
  generateEmbedding,
  generateBatchEmbeddings,
  EXPECTED_DIMENSION,
  retrieveSimilarChunks,
  generateRAGAnswer,
  isGeminiConfigured
};
