import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading documents from workspace...' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        gap: '1rem',
        color: 'var(--text-muted)'
      }}
    >
      <Loader2 size={32} className="spinner" color="var(--primary)" />
      <span style={{ fontSize: '0.875rem' }}>{message}</span>
    </div>
  );
}
