import React from 'react';
import { FileText, Plus, MessageSquare } from 'lucide-react';

export default function Sidebar({
  documentCount = 0,
  activeDocument,
  onNavigateHome,
  onOpenUpload,
  onOpenWorkspaceChat
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">AI</div>
          <span>Knowledge Workspace</span>
        </div>
      </div>

      <div className="sidebar-content">
        <button
          className={`sidebar-nav-item ${!activeDocument ? 'active' : ''}`}
          onClick={onNavigateHome}
        >
          <div className="nav-item-content">
            <FileText size={16} />
            <span>All Documents</span>
          </div>
          <span className="nav-badge">{documentCount}</span>
        </button>

        {documentCount > 0 && (
          <button
            className="sidebar-nav-item"
            onClick={onOpenWorkspaceChat}
          >
            <div className="nav-item-content">
              <MessageSquare size={16} />
              <span>Multi-Doc RAG</span>
            </div>
          </button>
        )}
      </div>

      <div className="sidebar-footer">
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={onOpenUpload}
        >
          <Plus size={16} />
          <span>Upload PDF</span>
        </button>
      </div>
    </aside>
  );
}
