import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileText, Loader2, AlertCircle, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess, onOpenExistingDocument }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file) => {
    setErrorMessage(null);
    setDuplicateData(null);
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMessage('Invalid file type. Please select a genuine PDF document.');
      setSelectedFile(null);
      return;
    }

    // 25 MB limit check
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25 MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (force = false) => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setDuplicateData(null);

      await onUploadSuccess(selectedFile, force);
      setSelectedFile(null);
      onClose();
    } catch (err) {
      // Check if duplicate was detected
      if (err.data && err.data.isDuplicate) {
        setDuplicateData(err.data);
      } else {
        setErrorMessage(err.message || 'Failed to upload document.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Upload PDF Document</div>
          <button className="modal-close-btn" onClick={onClose} disabled={isUploading}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {errorMessage && (
            <div className="alert-banner alert-banner-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Duplicate Detected Warning Panel */}
          {duplicateData && (
            <div className="duplicate-alert-panel" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 600 }}>
                <AlertTriangle size={18} />
                <span>Exact Duplicate Detected (SHA-256 Hash Match)</span>
              </div>
              <p style={{ margin: '6px 0 10px 0', fontSize: '0.85rem', color: '#78350f' }}>
                This exact file has already been uploaded as{' '}
                <strong>"{duplicateData.existingDocument?.original_filename}"</strong> on{' '}
                {new Date(duplicateData.existingDocument?.created_at).toLocaleDateString()}.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (onOpenExistingDocument) {
                      onOpenExistingDocument(duplicateData.existingDocument.id);
                      onClose();
                    }
                  }}
                >
                  <ArrowRight size={14} />
                  <span>Open Existing Document</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSubmit(true)}
                  disabled={isUploading}
                >
                  <span>Upload Anyway</span>
                </button>
              </div>
            </div>
          )}

          <div
            className={`dropzone ${isDragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              disabled={isUploading}
            />
            <UploadCloud className="dropzone-icon" />
            <div className="dropzone-text">
              <strong>Click to upload</strong> or drag and drop a PDF
            </div>
            <div className="dropzone-hint">
              PDF bytes will be SHA-256 hashed to detect duplicates and chunked for RAG. Up to 25 MB.
            </div>
          </div>

          {selectedFile && (
            <div className="file-preview">
              <div className="file-preview-info">
                <FileText size={18} color="var(--primary)" />
                <span title={selectedFile.name}>{selectedFile.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  ({formatFileSize(selectedFile.size)})
                </span>
              </div>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
                onClick={() => {
                  setSelectedFile(null);
                  setDuplicateData(null);
                }}
                disabled={isUploading}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSubmit(false)}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="spinner" />
                <span>Checking & Uploading...</span>
              </>
            ) : (
              'Upload & Process'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
