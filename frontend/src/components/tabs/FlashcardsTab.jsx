import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

export default function FlashcardsTab({ analysis }) {
  if (!analysis) return null;

  const flashcards = Array.isArray(analysis.flashcards)
    ? analysis.flashcards
    : typeof analysis.flashcards === 'string'
    ? JSON.parse(analysis.flashcards || '[]')
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (flashcards.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
        No flashcards generated for this document.
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleToggle = () => {
    setShowAnswer((prev) => !prev);
  };

  return (
    <div className="flashcards-container">
      <div className="flashcard-navigator">
        <span>
          Flashcard {currentIndex + 1} of {flashcards.length}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.375rem 0.625rem' }}
            onClick={handlePrev}
            disabled={flashcards.length <= 1}
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.375rem 0.625rem' }}
            onClick={handleNext}
            disabled={flashcards.length <= 1}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flashcard-card" onClick={handleToggle}>
        <div>
          <div className="flashcard-label">
            {showAnswer ? 'Answer' : 'Question'}
          </div>
          <div className="flashcard-text">
            {showAnswer ? currentCard.answer : currentCard.question}
          </div>
        </div>

        <div className="flashcard-instruction">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <RotateCw size={12} />
            Click card to {showAnswer ? 'show Question' : 'reveal Answer'}
          </span>
        </div>
      </div>
    </div>
  );
}
