import React from 'react';
import { FileUp } from 'lucide-react';

export default function EmptyState({ onOpenUpload }) {
  return (
    <div className="empty-state-box">
      <FileUp className="empty-state-icon" />
      <h3 className="empty-state-title">No documents yet</h3>
      <p className="empty-state-subtitle">
        Upload a PDF to start building your knowledge workspace and generate structured intelligence.
      </p>
      <button className="btn btn-primary" onClick={onOpenUpload}>
        Upload PDF
      </button>
    </div>
  );
}
