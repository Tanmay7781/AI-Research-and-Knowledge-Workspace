import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WorkspaceHeader from './components/WorkspaceHeader';
import DocumentList from './components/DocumentList';
import DocumentWorkspace from './components/DocumentWorkspace';
import EmptyState from './components/EmptyState';
import UploadModal from './components/UploadModal';
import LoadingState from './components/LoadingState';
import ErrorAlert from './components/ErrorAlert';
import {
  getDocuments,
  getDocument,
  uploadDocument,
  analyzeDocument,
  deleteDocument
} from './services/api';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [analyzingDocIds, setAnalyzingDocIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

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

  // Handle PDF Upload
  const handleUploadSuccess = async (file) => {
    const newDoc = await uploadDocument(file);
    // Refresh documents list
    await fetchDocuments();
    // Automatically open the uploaded document
    if (newDoc && newDoc.id) {
      setActiveDocumentId(newDoc.id);
    }
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
    } catch (err) {
      setErrorMessage(err.message || 'Analysis generation failed.');
      // Mark as failed in state
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

      // Remove from list
      setDocuments((prev) => prev.filter((d) => d.id !== docId));

      // If active document was deleted, navigate back home
      if (activeDocumentId === docId) {
        setActiveDocumentId(null);
        setActiveDocument(null);
      }
    } catch (err) {
      setErrorMessage(`Failed to delete document: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        documentCount={documents.length}
        activeDocument={activeDocument}
        onNavigateHome={() => setActiveDocumentId(null)}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* Top Header */}
        <WorkspaceHeader
          activeDocument={activeDocument}
          onNavigateHome={() => setActiveDocumentId(null)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onDeleteDocument={handleDeleteDocument}
          isDeleting={isDeleting}
        />

        {/* Scrollable Page Content */}
        <div className="page-container">
          {isLoadingDocs ? (
            <LoadingState message="Loading documents from PostgreSQL..." />
          ) : activeDocument ? (
            <DocumentWorkspace
              document={activeDocument}
              onAnalyzeDocument={handleAnalyzeDocument}
              isAnalyzing={analyzingDocIds.includes(activeDocument.id)}
            />
          ) : documents.length === 0 ? (
            <EmptyState onOpenUpload={() => setIsUploadOpen(true)} />
          ) : (
            <div>
              <div className="workspace-hero">
                <div>
                  <h1 className="workspace-title">Knowledge Workspace</h1>
                  <p className="workspace-description">
                    Upload documents and turn them into structured knowledge.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsUploadOpen(true)}
                >
                  + Upload PDF
                </button>
              </div>

              <DocumentList
                documents={documents}
                onOpenDocument={(doc) => setActiveDocumentId(doc.id)}
                onAnalyzeDocument={handleAnalyzeDocument}
                onDeleteDocument={handleDeleteDocument}
                analyzingDocIds={analyzingDocIds}
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Error Toast */}
      {errorMessage && (
        <ErrorAlert
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
}
