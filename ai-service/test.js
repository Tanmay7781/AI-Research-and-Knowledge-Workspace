const { validateAnalysis } = require('./src/analysisValidator');

console.log('Testing analysisValidator...');
const mockResponse = {
  summary: 'This is a test summary of the uploaded document.',
  key_points: ['Key point 1', 'Key point 2'],
  flashcards: [{ question: 'What is X?', answer: 'X is Y' }],
  quiz_questions: [{
    question: 'Sample question?',
    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
    correct_answer: 'Option 1',
    explanation: 'Explanation from text.'
  }],
  important_terms: [{ term: 'Term', definition: 'Definition' }]
};

const result = validateAnalysis(mockResponse);
if (result.summary && result.key_points.length === 2 && result.flashcards.length === 1) {
  console.log('Validator test passed successfully!');
} else {
  console.error('Validator test failed', result);
  process.exit(1);
}
