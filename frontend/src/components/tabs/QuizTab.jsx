import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, RotateCcw } from 'lucide-react';

export default function QuizTab({ analysis }) {
  if (!analysis) return null;

  const questions = Array.isArray(analysis.quiz_questions)
    ? analysis.quiz_questions
    : typeof analysis.quiz_questions === 'string'
    ? JSON.parse(analysis.quiz_questions || '[]')
    : [];

  const [selectedAnswers, setSelectedAnswers] = useState({});

  if (questions.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
        No quiz questions generated for this document.
      </div>
    );
  }

  const handleSelectOption = (questionIndex, option) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: option
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
  };

  return (
    <div className="quiz-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Test your comprehension of the key concepts from this document.
        </div>
        {Object.keys(selectedAnswers).length > 0 && (
          <button
            className="btn btn-secondary"
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
            onClick={handleResetQuiz}
          >
            <RotateCcw size={14} />
            <span>Reset Quiz</span>
          </button>
        )}
      </div>

      {questions.map((q, qIndex) => {
        const selected = selectedAnswers[qIndex];
        const isAnswered = selected !== undefined;
        const isCorrect = isAnswered && selected.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase();

        return (
          <div key={qIndex} className="quiz-card">
            <div className="quiz-question-number">
              Question {qIndex + 1} of {questions.length}
            </div>

            <div className="quiz-question-text">{q.question}</div>

            <div className="quiz-options">
              {q.options.map((option, optIndex) => {
                let btnClass = 'quiz-option-btn';
                const isThisSelected = selected === option;
                const isThisCorrectAnswer = option.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase();

                if (isAnswered) {
                  if (isThisSelected) {
                    btnClass += isCorrect ? ' selected-correct' : ' selected-incorrect';
                  } else if (isThisCorrectAnswer) {
                    // Highlight the correct answer if user got it wrong
                    btnClass += ' selected-correct';
                  }
                }

                return (
                  <button
                    key={optIndex}
                    className={btnClass}
                    onClick={() => handleSelectOption(qIndex, option)}
                  >
                    <span>{option}</span>
                    {isAnswered && isThisSelected && (
                      <span>
                        {isCorrect ? (
                          <CheckCircle2 size={16} color="var(--status-analyzed-text)" />
                        ) : (
                          <XCircle size={16} color="var(--status-failed-text)" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="quiz-explanation-box">
                <strong>Explanation:</strong> {q.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
