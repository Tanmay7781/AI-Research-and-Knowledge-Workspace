import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ErrorAlert({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="toast-alert error">
      <AlertCircle size={18} color="var(--status-failed-text)" />
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            marginLeft: '0.5rem'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
