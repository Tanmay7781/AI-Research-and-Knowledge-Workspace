import React from 'react';
import {
  FileText,
  Plus,
  MessageSquare,
  Search,
  GitCompare,
  Bookmark,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';

export default function Sidebar({
  documentCount = 0,
  activeView = 'documents', // 'documents', 'search', 'compare', 'notes'
  activeDocument = null,
  onNavigate,
  onOpenUpload,
  onOpenWorkspaceChat
}) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div
          className="sidebar-brand"
          onClick={() => onNavigate('landing')}
          style={{ cursor: 'pointer' }}
          title="Return to ResearchSpace Landing Page"
        >
          <div className="brand-icon">
            <Sparkles size={16} />
          </div>
          <div className="brand-text-group">
            <div className="brand-title">ResearchSpace</div>
            <div className="brand-subtitle">AI Intelligence & RAG</div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-content">
        <div className="nav-section-title">WORKSPACE</div>

        <button
          className={`sidebar-nav-item ${activeView === 'documents' && !activeDocument ? 'active' : ''}`}
          onClick={() => onNavigate('documents')}
        >
          <div className="nav-item-content">
            <FileText size={17} />
            <span>Documents Library</span>
          </div>
          <span className="nav-badge">{documentCount}</span>
        </button>

        <button
          className={`sidebar-nav-item ${activeView === 'search' ? 'active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          <div className="nav-item-content">
            <Search size={17} />
            <span>Full-Text Search</span>
          </div>
        </button>

        <button
          className={`sidebar-nav-item ${activeView === 'compare' ? 'active' : ''}`}
          onClick={() => onNavigate('compare')}
        >
          <div className="nav-item-content">
            <GitCompare size={17} />
            <span>Document Comparison</span>
          </div>
        </button>

        <button
          className={`sidebar-nav-item ${activeView === 'notes' ? 'active' : ''}`}
          onClick={() => onNavigate('notes')}
        >
          <div className="nav-item-content">
            <Bookmark size={17} />
            <span>Notes & Annotations</span>
          </div>
        </button>

        <div className="nav-section-title" style={{ marginTop: '1rem' }}>ASSISTANT</div>

        <button
          className="sidebar-nav-item"
          onClick={onOpenWorkspaceChat}
          disabled={documentCount === 0}
        >
          <div className="nav-item-content">
            <MessageSquare size={17} />
            <span>Multi-Doc Chat (RAG)</span>
          </div>
        </button>
      </div>

      {/* Footer Actions & System Status */}
      <div className="sidebar-footer">
        <button
          className="btn btn-primary sidebar-upload-btn"
          onClick={onOpenUpload}
        >
          <Plus size={16} />
          <span>Upload PDF Document</span>
        </button>

        <div className="sidebar-status-card">
          <div className="status-indicator-dot" />
          <div className="status-text">
            <strong>PostgreSQL Connected</strong>
            <span>Port 5432 • RAG Ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
