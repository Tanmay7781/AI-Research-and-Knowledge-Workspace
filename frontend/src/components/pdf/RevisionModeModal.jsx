import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sparkles,
  FileText,
  Calendar,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { getRevisionAnnotations } from '../../services/api';

export default function RevisionModeModal({
  isOpen,
  onClose,
  documentId = null,
  documentTitle = ''
}) {
  const [annotations, setAnnotations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterColor, setFilterColor] = useState('all');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadRevisionItems() {
      try {
        setIsLoading(true);
        const res = await getRevisionAnnotations(documentId);
        if (isMounted) {
          const items = res.revisionItems || res.annotations || [];
          setAnnotations(items);
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error('Failed to load revision items:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRevisionItems();

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const filteredItems = filterColor === 'all'
    ? annotations
    : annotations.filter(a => a.color === filterColor);

  const currentItem = filteredItems[currentIndex];

  const handleNext = () => {
    if (currentIndex < filteredItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(filteredItems.length - 1);
    }
  };

  const getColorHex = (color) => {
    switch (color) {
      case 'yellow': return '#fef08a';
      case 'green': return '#bbf7d0';
      case 'blue': return '#bfdbfe';
      case 'pink': return '#fbcfe8';
      default: return 'var(--primary-subtle)';
    }
  };

  const getColorBorder = (color) => {
    switch (color) {
      case 'yellow': return '#eab308';
      case 'green': return '#22c55e';
      case 'blue': return '#3b82f6';
      case 'pink': return '#ec4899';
      default: return 'var(--primary)';
    }
  };

  return (
    <div className="revision-modal-backdrop" onClick={onClose}>
      <div className="revision-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="revision-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Revision Flash Mode
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {documentTitle ? `Reviewing highlights from ${documentTitle}` : 'Rapid revision of saved annotations & passages'}
              </p>
            </div>
          </div>

          <button
            className="theme-toggle-btn"
            onClick={onClose}
            title="Close revision mode"
          >
            <X size={18} />
          </button>
        </div>

        {/* Color filter pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
          {['all', 'yellow', 'green', 'blue', 'pink'].map((col) => (
            <button
              key={col}
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: filterColor === col ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                backgroundColor: filterColor === col ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                color: filterColor === col ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
              onClick={() => {
                setFilterColor(col);
                setCurrentIndex(0);
              }}
            >
              {col}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {filteredItems.length} {filteredItems.length === 1 ? 'card' : 'cards'}
          </div>
        </div>

        {/* Body */}
        <div className="revision-body">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading revision flashcards...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <Bookmark size={36} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No annotations found</p>
              <p style={{ fontSize: '0.85rem' }}>Select text in the PDF reader to highlight and save notes for revision.</p>
            </div>
          ) : (
            <>
              {/* Meta information */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={15} color="var(--primary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentItem.document_title || documentTitle || 'Document'}
                  </span>
                  {currentItem.page_number && (
                    <span style={{
                      fontSize: '0.75rem',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 4,
                      color: 'var(--text-secondary)'
                    }}>
                      Page {currentItem.page_number}
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: getColorHex(currentItem.color),
                  color: '#000',
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getColorBorder(currentItem.color) }} />
                  {currentItem.color || 'Note'}
                </div>
              </div>

              {/* Context Before */}
              {currentItem.context_before && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                  "... {currentItem.context_before}"
                </div>
              )}

              {/* Highlighted Quote Box */}
              <div
                className="revision-quote-box"
                style={{
                  borderLeftColor: getColorBorder(currentItem.color),
                  backgroundColor: 'var(--bg-surface-subtle)'
                }}
              >
                "{currentItem.selected_text || currentItem.note_text}"
              </div>

              {/* Context After */}
              {currentItem.context_after && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                  "{currentItem.context_after} ..."
                </div>
              )}

              {/* Attached Note/Comment */}
              {currentItem.note_text && currentItem.selected_text && (
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Bookmark size={13} />
                    <span>Your Attached Note</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {currentItem.note_text}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="revision-footer">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {filteredItems.length > 0 && (
              <span>Card <strong>{currentIndex + 1}</strong> of <strong>{filteredItems.length}</strong></span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePrev}
              disabled={filteredItems.length <= 1}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleNext}
              disabled={filteredItems.length <= 1}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
