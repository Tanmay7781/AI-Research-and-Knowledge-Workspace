import React from 'react';
import { Plus, ArrowLeft, Trash2 } from 'lucide-react';

export default function WorkspaceHeader({
  activeDocument,
  onNavigateHome,
  onOpenUpload,
  onDeleteDocument,
  isDeleting
}) {
  return (
    <header className="top-header">
      <div className="header-breadcrumbs">
        <button className="breadcrumb-root" onClick={onNavigateHome}>
          Documents
        </button>
        {activeDocument && (
          <>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current" title={activeDocument.original_filename}>
              {activeDocument.original_filename}
            </span>
          </>
        )}
      </div>

      <div className="header-actions">
        {activeDocument ? (
          <>
            <button className="btn btn-secondary" onClick={onNavigateHome}>
              <ArrowLeft size={16} />
              <span>Back to Documents</span>
            </button>
            <button
              className="btn btn-danger"
              onClick={() => onDeleteDocument(activeDocument.id)}
              disabled={isDeleting}
            >
              <Trash2 size={16} />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onOpenUpload}>
            <Plus size={16} />
            <span>Upload PDF</span>
          </button>
        )}
      </div>
    </header>
  );
}
