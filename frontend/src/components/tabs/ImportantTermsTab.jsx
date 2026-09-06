import React from 'react';
import { Tag } from 'lucide-react';

export default function ImportantTermsTab({ analysis }) {
  if (!analysis) return null;

  const terms = Array.isArray(analysis.important_terms)
    ? analysis.important_terms
    : typeof analysis.important_terms === 'string'
    ? JSON.parse(analysis.important_terms || '[]')
    : [];

  if (terms.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
        No terms identified in this document.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Essential terminology, definitions, and domain entities defined within the document:
      </div>
      <div className="terms-grid">
        {terms.map((item, index) => (
          <div key={index} className="term-card">
            <div className="term-name">
              <Tag size={16} color="var(--primary)" />
              <span>{item.term}</span>
            </div>
            <div className="term-definition">{item.definition}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
