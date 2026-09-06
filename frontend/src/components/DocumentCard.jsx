import React from 'react';
import { FileText, Calendar, HardDrive, Trash2, ArrowRight, Loader2 } from 'lucide-react';

export default function DocumentCard({
  document,
  onOpenDocument,
  onAnalyzeDocument,
  onDeleteDocument,
  isAnalyzing
}) {
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'analyzed':
        return <span className="badge badge-analyzed">Analyzed</span>;
      case 'processing':
        return (
          <span className="badge badge-processing">
            <Loader2 size={12} className="spinner" />
            Processing
          </span>
        );
      case 'failed':
        return <span className="badge badge-failed">Analysis Failed</span>;
      default:
        return <span className="badge badge-uploaded">Uploaded</span>;
    }
  };

  const isCurrentAnalyzing = isAnalyzing || document.status === 'processing';

  return (
    <div className="document-card">
      <div>
        <div className="doc-card-header">
          <div className="doc-card-title-row">
            <FileText size={20} className="doc-icon" />
            <span className="doc-filename" title={document.original_filename}>
              {document.original_filename}
            </span>
          </div>
          {getStatusBadge(document.status)}
        </div>
      </div>

      <div>
        <div className="doc-card-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HardDrive size={12} />
            {formatFileSize(document.file_size)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} />
            {formatDate(document.created_at)}
          </span>
        </div>

        <div className="doc-card-actions" style={{ marginTop: '0.875rem' }}>
          {document.status === 'analyzed' ? (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => onOpenDocument(document)}
            >
              <span>View Analysis</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                if (document.status === 'uploaded' || document.status === 'failed') {
                  onAnalyzeDocument(document.id);
                } else {
                  onOpenDocument(document);
                }
              }}
              disabled={isCurrentAnalyzing}
            >
              {isCurrentAnalyzing ? (
                <>
                  <Loader2 size={14} className="spinner" />
                  <span>Analysing document...</span>
                </>
              ) : document.status === 'failed' ? (
                <span>Retry Analysis</span>
              ) : (
                <span>Analyse Document</span>
              )}
            </button>
          )}

          <button
            className="btn btn-secondary"
            title="Delete Document"
            onClick={() => onDeleteDocument(document.id)}
            disabled={isCurrentAnalyzing}
            style={{ padding: '0.5rem' }}
          >
            <Trash2 size={15} color="var(--text-muted)" />
          </button>
        </div>
      </div>
    </div>
  );
}
