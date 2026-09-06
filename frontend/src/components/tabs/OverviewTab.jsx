import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export default function OverviewTab({ analysis }) {
  if (!analysis) return null;

  const keyPoints = Array.isArray(analysis.key_points)
    ? analysis.key_points
    : typeof analysis.key_points === 'string'
    ? JSON.parse(analysis.key_points || '[]')
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <BookOpen size={18} color="var(--primary)" />
          Executive Summary
        </h3>
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            fontSize: '0.9375rem',
            whiteSpace: 'pre-line'
          }}
        >
          {analysis.summary}
        </div>
      </section>

      {keyPoints.length > 0 && (
        <section>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle2 size={18} color="var(--primary)" />
            Core Highlights
          </h3>
          <ul className="key-points-list">
            {keyPoints.slice(0, 5).map((point, index) => (
              <li key={index} className="key-point-item">
                <span className="key-point-bullet">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
