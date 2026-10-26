const path = require('path');
const dotenv = require('dotenv');

// Ensure root .env is loaded if not already in process.env
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Generates a grounded RAG response using Gemini based strictly on retrieved chunks.
 * 
 * @param {string} question - User's query
 * @param {Array<{id: string, documentId: string, filename: string, chunkIndex: number, pageNumber: number, content: string, similarity: number}>} retrievedChunks
 * @returns {Promise<{answer: string, sources: Array<object>, hasAnswer: boolean}>}
 */
async function generateRAGAnswer(question, retrievedChunks) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please set a valid Gemini API key.');
  }

  // If no relevant chunks were found above threshold
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer: 'The uploaded document does not contain information relevant to your question.',
      sources: [],
      hasAnswer: false
    };
  }

  // Format context blocks with real document name, genuine page number, and chunk index
  const contextBlocks = retrievedChunks.map((chunk, idx) => {
    const pageLabel = chunk.pageNumber ? `Page ${chunk.pageNumber}` : `Section ${chunk.chunkIndex + 1}`;
    return `[Source ${idx + 1}] (${chunk.filename} - ${pageLabel}, Chunk #${chunk.chunkIndex}):\n${chunk.content}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are a strict, grounded AI document research assistant.
Your goal is to answer the user's question using ONLY the provided Source context passages below.

CRITICAL GROUNDING RULES:
1. Base your answer EXCLUSIVELY on the provided sources.
2. Do NOT invent facts, extrapolate beyond what is stated, or use outside world knowledge.
3. If the provided sources do NOT contain enough information to answer the question, state:
   "The provided document(s) do not contain sufficient information to answer this question."
4. When stating facts, append the source citation tag (e.g. [Source 1], [Source 2]) corresponding to the passage where the fact appears.
5. Keep your tone objective, concise, and academic.`;

  const userPrompt = `CONTEXT SOURCES:
${contextBlocks}

USER QUESTION:
${question}

GROUNDED ANSWER:`;

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.8-flash'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let rawAnswer = '';
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.1 }
      });
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt }
      ]);
      rawAnswer = result.response.text().trim();
      break;
    } catch (apiError) {
      lastError = apiError;
      const status = apiError.status;
      const msg = apiError.message || '';
      const isRetryable = status === 404 || status === 503 ||
                          msg.includes('not found') || msg.includes('no longer available') ||
                          msg.includes('high demand') || msg.includes('overloaded');
      if (isRetryable && candidateModels.indexOf(modelName) < candidateModels.length - 1) {
        continue;
      }
      throw new Error(`Gemini Q&A generation error (${modelName}): ${apiError.message}`);
    }
  }

  if (!rawAnswer && lastError) {
    throw new Error(`Gemini Q&A generation error: ${lastError.message}`);
  }

  const cannotAnswerPhrases = [
    'do not contain sufficient information',
    'does not contain sufficient information',
    'cannot be found in the provided',
    'not mentioned in the provided',
    'does not contain information'
  ];
  const hasAnswer = !cannotAnswerPhrases.some(phrase => rawAnswer.toLowerCase().includes(phrase));

  const sources = retrievedChunks.map((chunk, idx) => ({
    sourceId: idx + 1,
    chunkId: chunk.id,
    documentId: chunk.documentId,
    filename: chunk.filename,
    pageNumber: chunk.pageNumber || null,
    chunkIndex: chunk.chunkIndex,
    similarity: Math.round(chunk.similarity * 100) / 100,
    excerpt: chunk.content.length > 250 ? chunk.content.substring(0, 250) + '...' : chunk.content,
    fullContent: chunk.content
  }));

  return {
    answer: rawAnswer,
    sources,
    hasAnswer
  };
}

module.exports = {
  generateRAGAnswer
};
