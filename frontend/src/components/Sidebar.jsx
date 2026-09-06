import React from 'react';
import { FileText, Plus, BookOpen, Layers } from 'lucide-react';

export default function Sidebar({
  documentCount = 0,
  activeDocument,
  onNavigateHome,
  onOpenUpload
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
