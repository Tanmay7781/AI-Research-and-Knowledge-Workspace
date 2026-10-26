import React from 'react';
import { Plus, ArrowLeft, Trash2, MessageSquare } from 'lucide-react';

export default function WorkspaceHeader({
  activeDocument,
  onNavigateHome,
  onOpenUpload,
  onOpenWorkspaceChat,
  onDeleteDocument,
  isDeleting,
  hasDocuments = false
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
          <div style={{ display: 'flex', gap: '8px' }}>
            {hasDocuments && (
              <button className="btn btn-secondary" onClick={onOpenWorkspaceChat}>
                <MessageSquare size={16} />
                <span>Multi-Doc Chat</span>
              </button>
            )}
            <button className="btn btn-primary" onClick={onOpenUpload}>
              <Plus size={16} />
              <span>Upload PDF</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
