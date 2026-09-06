/**
 * Validates and sanitizes Gemini structured analysis output.
 * Ensures data complies strictly with expected frontend and database schemas.
 * 
 * @param {any} data - Parsed JSON object from Gemini response.
 * @returns {object} Sanitized and structured analysis object.
 */
function validateAnalysis(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('AI response is not a valid object.');
  }

  // 1. Summary
  const summary = typeof data.summary === 'string' && data.summary.trim().length > 0
    ? data.summary.trim()
    : 'No summary could be derived from the document.';

  // 2. Key Points
  let key_points = [];
  if (Array.isArray(data.key_points)) {
    key_points = data.key_points
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(item => item.length > 0);
  }

  // 3. Flashcards
  let flashcards = [];
  if (Array.isArray(data.flashcards)) {
    flashcards = data.flashcards
      .filter(card => card && typeof card === 'object')
      .map(card => ({
        question: typeof card.question === 'string' ? card.question.trim() : 'Question not provided',
        answer: typeof card.answer === 'string' ? card.answer.trim() : 'Answer not provided'
      }))
      .filter(card => card.question.length > 0 && card.answer.length > 0);
  }

  // 4. Quiz Questions
  let quiz_questions = [];
  if (Array.isArray(data.quiz_questions)) {
    quiz_questions = data.quiz_questions
      .filter(q => q && typeof q === 'object')
      .map(q => {
        const question = typeof q.question === 'string' ? q.question.trim() : '';
        const options = Array.isArray(q.options)
          ? q.options.map(opt => (typeof opt === 'string' ? opt.trim() : String(opt))).filter(Boolean)
          : [];
        const correctAnswer = typeof q.correct_answer === 'string' ? q.correct_answer.trim() : (options[0] || '');
        const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : 'Explanation based on document content.';

        return {
          question,
          options,
          correct_answer: correctAnswer,
          explanation
        };
      })
      .filter(q => q.question.length > 0 && q.options.length >= 2);
  }

  // 5. Important Terms
  let important_terms = [];
  if (Array.isArray(data.important_terms)) {
    important_terms = data.important_terms
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        term: typeof item.term === 'string' ? item.term.trim() : '',
        definition: typeof item.definition === 'string' ? item.definition.trim() : ''
      }))
      .filter(item => item.term.length > 0 && item.definition.length > 0);
  }

  return {
    summary,
    key_points,
    flashcards,
    quiz_questions,
    important_terms
  };
}

module.exports = {
  validateAnalysis
};
