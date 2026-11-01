import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  GitCompare,
  Bookmark,
  FileText,
  Sparkles,
  Plus,
  ArrowRight,
  Database,
  Layers,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import WorkspaceHeader from './components/WorkspaceHeader';
import DocumentList from './components/DocumentList';
import DocumentWorkspace from './components/DocumentWorkspace';
import EmptyState from './components/EmptyState';
import UploadModal from './components/UploadModal';
import WorkspaceChatModal from './components/WorkspaceChatModal';
import LoadingState from './components/LoadingState';
import ErrorAlert from './components/ErrorAlert';
import SearchView from './components/SearchView';
import CompareView from './components/CompareView';
import NotesView from './components/NotesView';
import LandingPage from './components/LandingPage';
import {
  getDocuments,
  getDocument,
  uploadDocument,
  analyzeDocument,
  deleteDocument
} from './services/api';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('researchspace_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('researchspace_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [documents, setDocuments] = useState([]);
  const [activeView, setActiveView] = useState(() => {
    if (window.location.pathname === '/app') return 'documents';
    if (window.location.pathname === '/' || !window.location.pathname) return 'landing';
    return 'documents';
  });
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isWorkspaceChatOpen, setIsWorkspaceChatOpen] = useState(false);
  const [analyzingDocIds, setAnalyzingDocIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Filter & Search on Library page
  const [libraryFilter, setLibraryFilter] = useState('all'); // 'all', 'analyzed', 'uploaded'
  const [librarySearch, setLibrarySearch] = useState('');
  const [searchViewQuery, setSearchViewQuery] = useState('');

  // Selected document IDs for direct comparison
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);

  // Fetch all documents from PostgreSQL on mount
  const fetchDocuments = async () => {
    try {
      setIsLoadingDocs(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load documents from backend.');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch full active document details (including analysis) when activeDocumentId changes
  useEffect(() => {
    if (!activeDocumentId) {
      setActiveDocument(null);
      return;
    }

    let isMounted = true;
    const fetchDocDetails = async () => {
      try {
        const doc = await getDocument(activeDocumentId);
        if (isMounted) {
          setActiveDocument(doc);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(`Failed to load document: ${err.message}`);
        }
      }
    };

    fetchDocDetails();

    return () => {
      isMounted = false;
    };
  }, [activeDocumentId]);

  // Handle PDF Upload with Duplicate Support
  const handleUploadSuccess = async (file, force = false) => {
    const newDoc = await uploadDocument(file, force);
    await fetchDocuments();
    if (newDoc && newDoc.id) {
      setActiveDocumentId(newDoc.id);
      setActiveView('documents');
      setSuccessToast(`Document "${newDoc.original_filename}" uploaded successfully.`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Open existing document (e.g. from duplicate prompt or search)
  const handleOpenExistingDocument = (docId) => {
    setActiveView('documents');
    setActiveDocumentId(docId);
  };

  // Handle Document Analysis
  const handleAnalyzeDocument = async (docId) => {
    if (analyzingDocIds.includes(docId)) return;

    setAnalyzingDocIds((prev) => [...prev, docId]);
    setErrorMessage(null);

    // Optimistically update document status in state to 'processing'
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'processing' } : d))
    );
    if (activeDocument && activeDocument.id === docId) {
      setActiveDocument((prev) => ({ ...prev, status: 'processing' }));
    }

    try {
      const response = await analyzeDocument(docId);
      const updatedAnalysis = response.analysis;

      // Update documents list
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: 'analyzed', has_analysis: true } : d
        )
      );

      // If active document is the one analyzed, update its analysis
      if (activeDocument && activeDocument.id === docId) {
        setActiveDocument((prev) => ({
          ...prev,
          status: 'analyzed',
          analysis: updatedAnalysis
        }));
      }

      setSuccessToast('Analysis generated and persisted to PostgreSQL.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Analysis generation failed.');
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'failed' } : d))
      );
      if (activeDocument && activeDocument.id === docId) {
        setActiveDocument((prev) => ({ ...prev, status: 'failed' }));
      }
    } finally {
      setAnalyzingDocIds((prev) => prev.filter((id) => id !== docId));
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (docId) => {
    const targetDoc = documents.find((d) => d.id === docId) || activeDocument;
    const confirmName = targetDoc ? targetDoc.original_filename : 'this document';

    if (!window.confirm(`Are you sure you want to delete "${confirmName}" and its analysis?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDocument(docId);

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSelectedCompareIds((prev) => prev.filter((id) => id !== docId));

      if (activeDocumentId === docId) {
        setActiveDocumentId(null);
        setActiveDocument(null);
      }
      setSuccessToast('Document deleted.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      setErrorMessage(`Failed to delete document: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Toggle Compare Selection
  const handleToggleCompareSelect = (docId) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        if (prev.length >= 2) {
          // Keep the newest selection
          return [prev[1], docId];
        }
        return [...prev, docId];
      }
    });
  };

  // Quick search from header
  const handleQuickSearch = (query) => {
    setActiveDocumentId(null);
    setActiveDocument(null);
    setSearchViewQuery(query);
    setActiveView('search');
  };

  // Navigate views
  const handleNavigate = (view) => {
    setActiveView(view);
    setActiveDocumentId(null);
    setActiveDocument(null);
  };

  // Filtered documents for library view
  const filteredDocuments = documents.filter((doc) => {
    if (libraryFilter === 'analyzed' && doc.status !== 'analyzed') return false;
    if (libraryFilter === 'uploaded' && doc.status !== 'uploaded') return false;
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase();
      return (doc.original_filename || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate real metrics from actual database records
  const totalAnalyzed = documents.filter((d) => d.status === 'analyzed' || d.has_analysis).length;
  const totalUploaded = documents.filter((d) => d.status === 'uploaded').length;

  if (activeView === 'landing') {
    return (
      <LandingPage
        onLaunchWorkspace={() => {
          setActiveView('documents');
          window.history.pushState(null, '', '/app');
        }}
        onOpenCompare={() => {
          setActiveView('compare');
          window.history.pushState(null, '', '/app');
        }}
        onOpenSearch={() => {
          setActiveView('search');
          window.history.pushState(null, '', '/app');
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        documentCount={documents.length}
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        documentCount={documents.length}
        activeView={activeView}
        activeDocument={activeDocument}
        onNavigate={handleNavigate}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenWorkspaceChat={() => setIsWorkspaceChatOpen(true)}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* Top Header */}
        <WorkspaceHeader
          activeView={activeView}
          activeDocument={activeDocument}
          onNavigateHome={() => {
            setActiveDocumentId(null);
            setActiveDocument(null);
            setActiveView('documents');
          }}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenWorkspaceChat={() => setIsWorkspaceChatOpen(true)}
          onDeleteDocument={handleDeleteDocument}
          onQuickSearch={handleQuickSearch}
          isDeleting={isDeleting}
          hasDocuments={documents.length > 0}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Page Container */}
        <div className="page-container">
          {isLoadingDocs ? (
            <LoadingState message="Loading documents and research workspace from PostgreSQL..." />
          ) : activeDocument ? (
            /* Document Detail Workspace */
            <DocumentWorkspace
              document={activeDocument}
              onAnalyzeDocument={handleAnalyzeDocument}
              isAnalyzing={analyzingDocIds.includes(activeDocument.id)}
              onDocumentUpdated={(updatedDoc) => {
                setActiveDocument((prev) => ({ ...prev, ...updatedDoc }));
                fetchDocuments();
              }}
            />
          ) : activeView === 'search' ? (
            /* Full-Text Search View */
            <SearchView
              initialQuery={searchViewQuery}
              onOpenDocument={(doc) => {
                setActiveDocumentId(doc.id);
                setActiveView('documents');
              }}
            />
          ) : activeView === 'compare' ? (
            /* Document Comparison View */
            <CompareView
              documents={documents}
              onOpenDocument={(doc) => {
                setActiveDocumentId(doc.id);
                setActiveView('documents');
              }}
            />
          ) : activeView === 'notes' ? (
            /* Workspace-wide Notes Repository View */
            <NotesView
              documents={documents}
              onOpenDocument={(doc) => {
                setActiveDocumentId(doc.id);
                setActiveView('documents');
              }}
            />
          ) : documents.length === 0 ? (
            <EmptyState onOpenUpload={() => setIsUploadOpen(true)} />
          ) : (
            /* Main Documents Dashboard */
            <div>
              {/* Workspace Hero */}
              <div className="workspace-hero">
                <div className="workspace-hero-content">
                  <div className="hero-pill-badge">
                    <Sparkles size={13} />
                    <span>AI-Powered Document Intelligence</span>
                  </div>
                  <h1 className="workspace-title">Research Workspace</h1>
                  <p className="workspace-description">
                    Extract structured intelligence, run deterministic lexical comparison, search across all documents with PostgreSQL full-text search, and converse with grounded RAG models.
                  </p>
                </div>

                <div className="workspace-hero-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsWorkspaceChatOpen(true)}
                  >
                    <MessageSquare size={16} />
                    <span>Multi-Doc RAG</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsUploadOpen(true)}
                  >
                    <Plus size={16} />
                    <span>Upload PDF</span>
                  </button>
                </div>
              </div>

              {/* Real Database Metrics Cards */}
              <div className="stats-dashboard-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrapper stat-icon-blue">
                    <FileText size={20} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-number">{documents.length}</div>
                    <div className="stat-label">Total Documents</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper stat-icon-green">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-number">{totalAnalyzed}</div>
                    <div className="stat-label">AI-Analyzed Papers</div>
                  </div>
                </div>

                <div className="stat-card" onClick={() => setActiveView('compare')} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon-wrapper stat-icon-purple">
                    <GitCompare size={20} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-number">Compare</div>
                    <div className="stat-label">Lexical Diff Engine</div>
                  </div>
                </div>

                <div className="stat-card" onClick={() => setActiveView('notes')} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon-wrapper stat-icon-amber">
                    <Bookmark size={20} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-number">Notes</div>
                    <div className="stat-label">Research Annotations</div>
                  </div>
                </div>
              </div>

              {/* Floating Comparison Selection Banner */}
              {selectedCompareIds.length > 0 && (
                <div className="compare-selection-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GitCompare size={18} color="var(--primary)" />
                    <span>
                      <strong>{selectedCompareIds.length}</strong> {selectedCompareIds.length === 1 ? 'document selected' : 'documents selected'} for comparison
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedCompareIds([])}
                    >
                      Clear
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveView('compare')}
                      disabled={selectedCompareIds.length < 2}
                    >
                      <span>Compare Selected ({selectedCompareIds.length}/2)</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Library Controls Bar */}
              <div className="library-controls-bar">
                {/* Search in library */}
                <div className="library-search-box">
                  <Search size={15} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Filter documents by title..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                  />
                  {librarySearch && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setLibrarySearch('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter pills */}
                <div className="library-filter-pills">
                  <button
                    className={`filter-pill ${libraryFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setLibraryFilter('all')}
                  >
                    All ({documents.length})
                  </button>
                  <button
                    className={`filter-pill ${libraryFilter === 'analyzed' ? 'active' : ''}`}
                    onClick={() => setLibraryFilter('analyzed')}
                  >
                    Analyzed ({totalAnalyzed})
                  </button>
                  <button
                    className={`filter-pill ${libraryFilter === 'uploaded' ? 'active' : ''}`}
                    onClick={() => setLibraryFilter('uploaded')}
                  >
                    Uploaded ({totalUploaded})
                  </button>
                </div>
              </div>

              {/* Documents Grid */}
              {filteredDocuments.length === 0 ? (
                <div className="library-empty-filtered">
                  <p>No documents found matching "{librarySearch}".</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => setLibrarySearch('')}>
                    Reset Filter
                  </button>
                </div>
              ) : (
                <DocumentList
                  documents={filteredDocuments}
                  onOpenDocument={(doc) => {
                    setActiveDocumentId(doc.id);
                  }}
                  onAnalyzeDocument={handleAnalyzeDocument}
                  onDeleteDocument={handleDeleteDocument}
                  analyzingDocIds={analyzingDocIds}
                  selectedCompareIds={selectedCompareIds}
                  onToggleCompareSelect={handleToggleCompareSelect}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal with Duplicate Support */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onOpenExistingDocument={handleOpenExistingDocument}
      />

      {/* Multi-Document Workspace Chat Modal */}
      <WorkspaceChatModal
        isOpen={isWorkspaceChatOpen}
        onClose={() => setIsWorkspaceChatOpen(false)}
        documents={documents}
      />

      {/* Success Notification Toast */}
      {successToast && (
        <div className="toast-notification">
          <CheckCircle2 size={16} color="var(--status-analyzed-text)" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <ErrorAlert
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
}
