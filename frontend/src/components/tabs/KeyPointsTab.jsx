import React from 'react';

export default function KeyPointsTab({ analysis }) {
  if (!analysis) return null;

  const keyPoints = Array.isArray(analysis.key_points)
    ? analysis.key_points
    : typeof analysis.key_points === 'string'
    ? JSON.parse(analysis.key_points || '[]')
    : [];

  if (keyPoints.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
        No key points identified for this document.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Key takeaways and synthesized insights extracted directly from the document:
      </div>
      <ul className="key-points-list">
        {keyPoints.map((point, index) => (
          <li key={index} className="key-point-item">
            <span className="key-point-bullet">{index + 1}.</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
