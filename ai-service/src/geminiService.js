const path = require('path');
const dotenv = require('dotenv');

// Ensure root .env is loaded if not already in process.env
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validateAnalysis } = require('./analysisValidator');

/**
 * Strips markdown code fences or surrounding text if model returns wrapped JSON.
 * @param {string} rawText 
 * @returns {string} Clean JSON string
 */
function cleanJsonOutput(rawText) {
  if (!rawText) return '{}';
  let cleaned = rawText.trim();
  
  // Remove markdown code fences ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
  }
  
  // If there's still text before the first '{', find the substring between first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}

/**
 * Calls Gemini API with extracted document text and generates structured analysis.
 * 
 * @param {string} documentText - Extracted text content from the PDF.
 * @returns {Promise<object>} Structured analysis matching validated schema.
 */
async function generateAnalysisFromText(documentText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    throw new Error(
      'GEMINI_API_KEY is not configured in .env. Please set a valid Gemini API key in your root .env file.'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());

  // Verified active model chain with automatic fallback
  const preferredModel = process.env.GEMINI_MODEL;
  const candidateModels = [
    preferredModel,
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.8-flash'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  const prompt = `You are a rigorous document intelligence analyzer.
Your task is to analyze the provided document text and produce a structured JSON object.

CRITICAL INSTRUCTIONS:
- Use ONLY information present in the supplied document text.
- Do NOT invent facts.
- Do NOT hallucinate information.
- Generate flashcards based ONLY on facts stated in the document.
- Generate quiz questions with 4 distinct options based ONLY on facts stated in the document.
- Generate important terms based ONLY on definitions or concepts mentioned in the document.
- If information is insufficient for a particular section, provide fewer, high-accuracy items rather than inventing information.
- You MUST output strictly valid JSON matching this schema:

{
  "summary": "Concise and comprehensive summary of the document",
  "key_points": [
    "Important key takeaway 1",
    "Important key takeaway 2"
  ],
  "flashcards": [
    {
      "question": "Question testing knowledge from document",
      "answer": "Accurate answer grounded in document"
    }
  ],
  "quiz_questions": [
    {
      "question": "Multiple-choice question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Brief explanation citing what the document states"
    }
  ],
  "important_terms": [
    {
      "term": "Term or Concept",
      "definition": "Definition based strictly on the document context"
    }
  ]
}

DOCUMENT TEXT:
${documentText}
`;

  let responseText = '';
  let modelUsed = '';
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
      modelUsed = modelName;
      break;
    } catch (apiError) {
      lastError = apiError;
      // If 404 (model not found/deprecated), 503 (high demand), or retryable error, try next candidate model
      const status = apiError.status;
      const msg = apiError.message || '';
      const isRetryable = status === 404 || status === 503 ||
                          msg.includes('not found') || msg.includes('no longer available') ||
                          msg.includes('high demand') || msg.includes('overloaded');
      if (isRetryable && candidateModels.indexOf(modelName) < candidateModels.length - 1) {
        console.warn(`Gemini model ${modelName} returned notice (${status || 'error'}), attempting next fallback model...`);
        continue;
      }
      throw new Error(`Gemini API error (${modelName}): ${apiError.message || 'Request failed'}`);
    }
  }

  if (!responseText) {
    throw new Error(`Gemini API error: ${lastError?.message || 'All candidate models failed'}`);
  }

  const cleanedJson = cleanJsonOutput(responseText);

  let parsedData;
  try {
    parsedData = JSON.parse(cleanedJson);
  } catch (parseError) {
    throw new Error(`Failed to parse AI output as JSON: ${parseError.message}`);
  }

  // Validate and sanitize data
  const validated = validateAnalysis(parsedData);
  validated.modelName = modelUsed;
  return validated;
}

module.exports = {
  generateAnalysisFromText
};
