import React, { useState } from 'react';
import {
  Plus,
  ArrowLeft,
  Trash2,
  MessageSquare,
  Search,
  FileText,
  GitCompare,
  Bookmark,
  Sun,
  Moon
} from 'lucide-react';

export default function WorkspaceHeader({
  activeView = 'documents',
  activeDocument = null,
  onNavigateHome,
  onOpenUpload,
  onOpenWorkspaceChat,
  onDeleteDocument,
  onQuickSearch,
  isDeleting = false,
  hasDocuments = false,
  theme = 'dark',
  onToggleTheme
}) {
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');

  const handleHeaderSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearchQuery.trim() && onQuickSearch) {
      onQuickSearch(headerSearchQuery.trim());
      setHeaderSearchQuery('');
    }
  };

  const getViewTitle = () => {
    if (activeDocument) return activeDocument.original_filename;
    switch (activeView) {
      case 'search': return 'Full-Text Search';
      case 'compare': return 'Document Comparison';
      case 'notes': return 'Notes & Annotations';
      default: return 'Documents Library';
    }
  };

  return (
    <header className="top-header">
      {/* Breadcrumbs */}
      <div className="header-breadcrumbs">
        <button
          className="breadcrumb-root"
          onClick={onNavigateHome}
        >
          ResearchSpace
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current" title={getViewTitle()}>
          {getViewTitle()}
        </span>
      </div>

      {/* Global Quick Search Input */}
      {!activeDocument && (
        <form onSubmit={handleHeaderSearchSubmit} className="header-quick-search">
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Quick search documents & text..."
            value={headerSearchQuery}
            onChange={(e) => setHeaderSearchQuery(e.target.value)}
          />
        </form>
      )}

      {/* Right Header Actions */}
      <div className="header-actions">
        {activeDocument ? (
          <>
            <button className="btn btn-secondary" onClick={onNavigateHome}>
              <ArrowLeft size={16} />
              <span>Back to Library</span>
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onToggleTheme && (
              <button
                className="theme-toggle-btn"
                onClick={onToggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#6366f1" />}
              </button>
            )}
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
