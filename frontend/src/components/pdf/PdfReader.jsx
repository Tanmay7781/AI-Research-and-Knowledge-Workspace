import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  Sparkles,
  Trash2,
  Highlighter,
  MessageSquare,
  Check,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
  Download
} from 'lucide-react';
import {
  getDocumentFileUrl,
  getDocumentDownloadUrl,
  getDocumentAnnotations,
  createAnnotation,
  deleteAnnotation
} from '../../services/api';
import RevisionModeModal from './RevisionModeModal';

// Point to local public worker for reliable, same-origin worker initialization
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export default function PdfReader({ document: doc }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const [filterColor, setFilterColor] = useState('all');

  // Text selection & highlight popover
  const [selectionData, setSelectionData] = useState(null); // { text, rect, contextBefore, contextAfter }
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [noteInput, setNoteInput] = useState('');
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);

  // Revision mode modal
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Fetch annotations from DB
  const loadAnnotations = useCallback(async () => {
    if (!doc?.id) return;
    try {
      const res = await getDocumentAnnotations(doc.id);
      setAnnotations(res.annotations || []);
    } catch (err) {
      console.error('Failed to load annotations:', err);
    }
  }, [doc?.id]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Load PDF Document via direct arrayBuffer fetch (robust across all browsers and workers)
  useEffect(() => {
    if (!doc?.id) return;

    let isMounted = true;
    let currentLoadingTask = null;
    setIsLoadingPdf(true);
    setPdfError(null);

    const loadPdfData = async () => {
      try {
        const pdfUrl = getDocumentFileUrl(doc.id);
        const res = await fetch(pdfUrl);
        if (!res.ok) {
          let errText = `Server returned HTTP ${res.status}: ${res.statusText}`;
          try {
            const errJson = await res.json();
            if (errJson?.error) errText = errJson.error;
          } catch (e) {}
          throw new Error(errText);
        }
        const arrayBuffer = await res.arrayBuffer();
        if (!isMounted) return;

        currentLoadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true
        });

        const loadedPdf = await currentLoadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setCurrentPage(1);
        setIsLoadingPdf(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('PDF load error:', err);
        setPdfError(err.message || 'Failed to load PDF file');
        setIsLoadingPdf(false);
      }
    };

    loadPdfData();

    return () => {
      isMounted = false;
      if (currentLoadingTask) {
        currentLoadingTask.destroy();
      }
    };
  }, [doc?.id, retryCount]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    let isCancelled = false;

    pdfDoc.getPage(currentPage).then(async (page) => {
      if (isCancelled) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;

        // Render Text Layer for native selection and visual persistent highlights
        if (textLayerRef.current && !isCancelled) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = Math.floor(viewport.width) + 'px';
          textLayerRef.current.style.height = Math.floor(viewport.height) + 'px';

          const textContent = await page.getTextContent();
          if (isCancelled) return;

          // Annotations on current page
          const pageAnnots = annotations.filter(a => a.page_number === currentPage && a.selected_text);

          // Build text layer elements
          for (const item of textContent.items) {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.fontSize = `${fontHeight}px`;
            span.style.fontFamily = item.fontName || 'sans-serif';
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - fontHeight}px`;
            span.style.position = 'absolute';
            span.style.color = 'transparent';
            span.style.whiteSpace = 'pre';
            span.style.cursor = 'text';
            span.style.transformOrigin = '0% 0%';

            // Check if this span intersects any persistent highlight for this page
            if (pageAnnots.length > 0 && item.str.trim().length > 1) {
              const cleanItem = item.str.trim().toLowerCase();
              for (const ann of pageAnnots) {
                const cleanSel = (ann.selected_text || '').trim().toLowerCase();
                if (cleanSel && (cleanSel.includes(cleanItem) || cleanItem.includes(cleanSel))) {
                  const colMap = {
                    yellow: 'rgba(254, 240, 138, 0.45)',
                    green: 'rgba(187, 247, 208, 0.45)',
                    blue: 'rgba(191, 219, 254, 0.45)',
                    pink: 'rgba(251, 207, 232, 0.45)'
                  };
                  span.style.backgroundColor = colMap[ann.color] || colMap.yellow;
                  span.style.borderRadius = '2px';
                  if (ann.note_text) {
                    span.title = `Note: ${ann.note_text}`;
                  }
                  break;
                }
              }
            }

            textLayerRef.current.appendChild(span);
          }
        }
      } catch (renderErr) {
        if (renderErr.name !== 'RenderingCancelledException') {
          console.error('Page render error:', renderErr);
        }
      }
    });

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale, annotations]);

  // Handle Text Selection inside the PDF
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textLayerRef.current) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) {
      return;
    }

    // Ensure selection is within our text layer
    const range = selection.getRangeAt(0);
    if (!textLayerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Context before & after calculation
    const allText = textLayerRef.current.innerText || '';
    const selIdx = allText.indexOf(selectedText);
    let contextBefore = null;
    let contextAfter = null;
    if (selIdx !== -1) {
      contextBefore = allText.slice(Math.max(0, selIdx - 60), selIdx).trim();
      contextAfter = allText.slice(selIdx + selectedText.length, selIdx + selectedText.length + 60).trim();
    }

    setSelectionData({
      text: selectedText,
      top: rect.top - containerRect.top + (containerRef.current.scrollTop || 0) - 10,
      left: Math.max(10, rect.left - containerRect.left),
      contextBefore,
      contextAfter
    });
  };

  const handleSaveHighlight = async () => {
    if (!selectionData?.text || !doc?.id) return;

    try {
      setIsSavingHighlight(true);
      await createAnnotation(doc.id, {
        note_text: noteInput.trim() || null,
        selected_text: selectionData.text,
        page_number: currentPage,
        annotation_type: 'highlight',
        color: selectedColor,
        context_before: selectionData.contextBefore,
        context_after: selectionData.contextAfter
      });

      // Clear selection
      window.getSelection()?.removeAllRanges();
      setSelectionData(null);
      setNoteInput('');
      await loadAnnotations();
    } catch (err) {
      console.error('Error saving highlight:', err);
    } finally {
      setIsSavingHighlight(false);
    }
  };

  const handleDeleteAnnotation = async (annId) => {
    try {
      await deleteAnnotation(doc.id, annId);
      await loadAnnotations();
    } catch (err) {
      console.error('Error deleting annotation:', err);
    }
  };

  const filteredAnnotations = filterColor === 'all'
    ? annotations
    : annotations.filter(a => a.color === filterColor);

  const currentPageAnnotations = annotations.filter(a => a.page_number === currentPage);

  return (
    <div className="pdf-reader-container">
      {/* Main View Area */}
      <div className="pdf-main-area">
        {/* PDF Top Toolbar */}
        <div className="pdf-toolbar-bar">
          {/* Page controls */}
          <div className="pdf-toolbar-group">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || isLoadingPdf}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="pdf-page-display">
              Page <strong>{currentPage}</strong> of <strong>{numPages || 1}</strong>
            </span>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(prev => Math.min(numPages, prev + 1))}
              disabled={currentPage >= numPages || isLoadingPdf}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="pdf-toolbar-group">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 40, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setScale(1.2)}
              title="Reset Zoom"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Action Tools */}
          <div className="pdf-toolbar-group">
            <a
              href={getDocumentFileUrl(doc.id)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              title="Open PDF directly in a new browser tab"
            >
              <ExternalLink size={14} />
              <span>Open in Tab</span>
            </a>
            <a
              href={getDocumentDownloadUrl(doc.id)}
              download
              className="btn btn-secondary btn-sm"
              title="Download original PDF file"
            >
              <Download size={14} />
              <span>Download</span>
            </a>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsRevisionOpen(true)}
              title="Open Flash Revision Mode"
            >
              <Sparkles size={14} />
              <span>Revision Mode ({annotations.length})</span>
            </button>
          </div>
        </div>

        {/* PDF Viewport Scroll Area */}
        <div
          className="pdf-viewport-scroll"
          ref={containerRef}
          onMouseUp={handleMouseUp}
        >
          {isLoadingPdf ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
              <span>Rendering PDF document...</span>
            </div>
          ) : pdfError ? (
            <div style={{ textAlign: 'center', color: 'var(--status-failed-text)', padding: '3rem', maxWidth: '480px', margin: '0 auto' }}>
              <AlertCircle size={36} style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{pdfError}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                The PDF could not be fetched or rendered. Check server logs or use the actions below.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setPdfError(null);
                    setIsLoadingPdf(true);
                    setRetryCount(r => r + 1);
                  }}
                >
                  Retry Loading
                </button>
                <a
                  href={getDocumentFileUrl(doc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <ExternalLink size={13} />
                  <span>Open in Tab</span>
                </a>
                <a
                  href={getDocumentDownloadUrl(doc.id)}
                  download
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="pdf-page-wrapper">
              <canvas ref={canvasRef} />
              <div className="pdf-text-layer" ref={textLayerRef} />

              {/* Floating Highlight / Note Popover */}
              {selectionData && (
                <div
                  className="pdf-selection-popup"
                  style={{
                    top: selectionData.top,
                    left: selectionData.left
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Highlight Selection
                    </span>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      onClick={() => setSelectionData(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Color Selector */}
                  <div className="color-picker-row">
                    {['yellow', 'green', 'blue', 'pink'].map((col) => (
                      <div
                        key={col}
                        className={`color-chip chip-${col} ${selectedColor === col ? 'selected' : ''}`}
                        onClick={() => setSelectedColor(col)}
                        title={col}
                      />
                    ))}
                  </div>

                  {/* Optional Note */}
                  <input
                    type="text"
                    placeholder="Attach note or reflection (optional)..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: 4,
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveHighlight();
                    }}
                  />

                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectionData(null)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveHighlight}
                      disabled={isSavingHighlight}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      <Check size={12} />
                      <span>{isSavingHighlight ? 'Saving...' : 'Save Highlight'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Annotations Sidebar */}
      <div className="pdf-sidebar">
        <div className="pdf-sidebar-header">
          <div className="pdf-sidebar-title">
            <Bookmark size={16} color="var(--primary)" />
            <span>Highlights & Notes ({filteredAnnotations.length})</span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsRevisionOpen(true)}
            title="Open Flash Revision Mode"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            <Sparkles size={12} />
            <span>Revise</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.35rem', padding: '0.6rem 0.85rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-subtle)' }}>
          {['all', 'yellow', 'green', 'blue', 'pink'].map(col => (
            <button
              key={col}
              style={{
                fontSize: '0.7rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '9999px',
                border: filterColor === col ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                backgroundColor: filterColor === col ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                color: filterColor === col ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
              onClick={() => setFilterColor(col)}
            >
              {col}
            </button>
          ))}
        </div>

        {/* List of Annotations */}
        <div className="pdf-annotations-scroll">
          {filteredAnnotations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Highlighter size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p>No highlights yet</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Select text in the PDF reader to highlight and save notes.
              </p>
            </div>
          ) : (
            filteredAnnotations.map((ann) => (
              <div
                key={ann.id}
                className={`pdf-annot-card ${ann.color || 'yellow'}`}
                style={{ cursor: ann.page_number ? 'pointer' : 'default' }}
                onClick={() => {
                  if (ann.page_number && ann.page_number !== currentPage) {
                    setCurrentPage(ann.page_number);
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {ann.page_number ? `Page ${ann.page_number}` : 'General Note'}
                  </span>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(ann.id);
                    }}
                    title="Delete highlight"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {ann.selected_text && (
                  <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    "{ann.selected_text}"
                  </div>
                )}

                {ann.note_text && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {ann.note_text}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Revision Mode Flashcard Modal */}
      <RevisionModeModal
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        documentId={doc?.id}
        documentTitle={doc?.original_filename}
      />
    </div>
  );
}
