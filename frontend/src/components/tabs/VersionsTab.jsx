import React, { useState, useEffect } from 'react';
import {
  History,
  Upload,
  RotateCcw,
  CheckCircle,
  FileText,
  Calendar,
  HardDrive,
  Hash,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  getDocumentVersions,
  uploadDocumentVersion,
  restoreDocumentVersion,
  getVersionFileUrl
} from '../../services/api';

export default function VersionsTab({ document, onDocumentUpdated }) {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchVersions = async () => {
    if (!document?.id) return;
    try {
      setIsLoading(true);
      const res = await getDocumentVersions(document.id);
      setVersions(res.versions || []);
    } catch (err) {
      setErrorMessage('Failed to load version history: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [document?.id]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Only PDF documents are supported for version uploads.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a PDF file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      const res = await uploadDocumentVersion(document.id, selectedFile);
      setSuccessMessage(res.message || 'New version uploaded successfully.');
      setSelectedFile(null);
      setShowUploadForm(false);
      await fetchVersions();
      if (onDocumentUpdated) {
        onDocumentUpdated(res.document);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage('Failed to upload new version: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRestoreVersion = async (versionNumber, filename) => {
    const confirmRestore = window.confirm(
      `Restore Version ${versionNumber} ("${filename}") as the new current revision?\n\nThis safe operation creates a new version without deleting previous audit history, and invalidates any stale RAG vector chunks.`
    );
    if (!confirmRestore) return;

    try {
      setIsRestoring(true);
      setErrorMessage(null);
      const res = await restoreDocumentVersion(document.id, versionNumber);
      setSuccessMessage(res.message);
      await fetchVersions();
      if (onDocumentUpdated) {
        onDocumentUpdated(res.document);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage('Failed to restore version: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="versions-tab-container">
      {/* Header Banner */}
      <div className="versions-header-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Document Version History ({versions.length})
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track file revisions, SHA-256 byte hashes, and restore historical versions while maintaining complete RAG vector consistency.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowUploadForm(!showUploadForm)}
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
        >
          <Upload size={15} />
          <span>{showUploadForm ? 'Cancel' : 'Upload New Version'}</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="alert-banner alert-banner-error" style={{ marginBottom: '1rem' }}>
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}
      {successMessage && (
        <div className="alert-banner alert-banner-success" style={{ marginBottom: '1rem' }}>
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* Upload New Version Card */}
      {showUploadForm && (
        <div className="version-upload-card">
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            Upload Revision for "{document.original_filename}"
          </h4>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            The new PDF will be assigned the next sequential version number. Stale RAG chunks and analysis will be cleanly reset so questions are always answered from the latest text.
          </p>

          <form onSubmit={handleUploadVersion}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="form-input"
                style={{ padding: '0.6rem' }}
                required
              />
              {selectedFile && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadForm(false);
                  setSelectedFile(null);
                }}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={15} className="spinner" />
                    <span>Uploading Version...</span>
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    <span>Save as Version {versions.length > 0 ? (versions[0].version_number + 1) : 2}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline List */}
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading version timeline from PostgreSQL...
        </div>
      ) : versions.length === 0 ? (
        <div className="versions-empty-state">
          <History size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
          <h4>Initial Version Record</h4>
          <p>
            This document is at Version 1. Any subsequent PDF updates uploaded will be saved as new revisions here.
          </p>
        </div>
      ) : (
        <div className="versions-timeline">
          {versions.map((ver, index) => {
            const isLatest = index === 0;

            return (
              <div key={ver.id} className={`version-card ${isLatest ? 'version-card-current' : ''}`}>
                <div className="version-badge-col">
                  <div className={`version-tag ${isLatest ? 'version-tag-current' : ''}`}>
                    v{ver.version_number}
                  </div>
                  {isLatest && <span className="version-current-label">Current Active</span>}
                </div>

                <div className="version-info-col">
                  <div className="version-title-row">
                    <span className="version-filename" title={ver.original_filename}>
                      {ver.original_filename}
                    </span>
                    {ver.has_text && (
                      <span className="badge badge-uploaded" style={{ fontSize: '0.7rem' }}>
                        Text Extracted
                      </span>
                    )}
                  </div>

                  <div className="version-meta-row">
                    <span>
                      <HardDrive size={13} />
                      {formatFileSize(ver.file_size)}
                    </span>
                    <span>
                      <Calendar size={13} />
                      {new Date(ver.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {ver.file_sha256 && (
                      <span className="version-hash" title={`SHA-256: ${ver.file_sha256}`}>
                        <Hash size={13} />
                        {ver.file_sha256.substring(0, 12)}...
                      </span>
                    )}
                  </div>
                </div>

                <div className="version-actions-col" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={getVersionFileUrl(document.id, ver.version_number)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    title={`View historical PDF of Version ${ver.version_number}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={13} />
                    <span>View PDF</span>
                  </a>

                  {isLatest ? (
                    <div className="current-active-indicator">
                      <CheckCircle size={15} color="var(--status-analyzed-text)" />
                      <span>Active Revision</span>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRestoreVersion(ver.version_number, ver.original_filename)}
                      disabled={isRestoring}
                      title="Safely restores this version as the new current revision"
                    >
                      <RotateCcw size={14} />
                      <span>Restore This</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
