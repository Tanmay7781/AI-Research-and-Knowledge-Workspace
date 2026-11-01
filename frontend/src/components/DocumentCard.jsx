import React from 'react';
import {
  FileText,
  Calendar,
  HardDrive,
  Trash2,
  ArrowRight,
  Loader2,
  Sparkles,
  Hash,
  GitCompare,
  MessageSquare
} from 'lucide-react';

export default function DocumentCard({
  document,
  onOpenDocument,
  onAnalyzeDocument,
  onDeleteDocument,
  isAnalyzing,
  isSelectedForCompare = false,
  onToggleCompareSelect
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
    <div className={`document-card ${isSelectedForCompare ? 'document-card-selected' : ''}`}>
      {/* Top Header Row with Checkbox and Status */}
      <div className="doc-card-top-bar">
        {onToggleCompareSelect && (
          <label className="compare-checkbox-label" title="Select for comparison">
            <input
              type="checkbox"
              checked={isSelectedForCompare}
              onChange={() => onToggleCompareSelect(document.id)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Compare</span>
          </label>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {getStatusBadge(document.status)}
        </div>
      </div>

      {/* Title & Icon */}
      <div className="doc-card-main-info" onClick={() => onOpenDocument(document)} style={{ cursor: 'pointer' }}>
        <div className="doc-icon-wrapper">
          <FileText size={22} color="var(--primary)" />
        </div>
        <div className="doc-title-container">
          <h4 className="doc-filename" title={document.original_filename}>
            {document.original_filename}
          </h4>
          <div className="doc-card-meta">
            <span>
              <HardDrive size={12} />
              {formatFileSize(document.file_size)}
            </span>
            <span>
              <Calendar size={12} />
              {formatDate(document.created_at)}
            </span>
            {document.file_sha256 && (
              <span className="doc-sha-tag" title={`SHA-256: ${document.file_sha256}`}>
                <Hash size={11} />
                {document.file_sha256.substring(0, 8)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="doc-card-actions">
        {document.status === 'analyzed' ? (
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={() => onOpenDocument(document)}
          >
            <span>View Analysis</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            className="btn btn-secondary btn-sm"
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
                <Loader2 size={13} className="spinner" />
                <span>Analysing...</span>
              </>
            ) : document.status === 'failed' ? (
              <>
                <Sparkles size={13} />
                <span>Retry Analysis</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>Analyse</span>
              </>
            )}
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onOpenDocument(document)}
          title="Open workspace"
          style={{ padding: '0.45rem 0.65rem' }}
        >
          <span>Open</span>
        </button>

        <button
          className="btn btn-secondary btn-sm btn-icon-danger"
          title="Delete Document"
          onClick={() => onDeleteDocument(document.id)}
          disabled={isCurrentAnalyzing}
          style={{ padding: '0.45rem 0.65rem' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
