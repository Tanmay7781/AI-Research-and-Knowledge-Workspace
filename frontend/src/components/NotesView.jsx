import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  Filter,
  Calendar,
  ArrowRight,
  Highlighter,
  HelpCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  getDocumentAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation
} from '../services/api';

export default function NotesView({ documents = [], onOpenDocument }) {
  const [selectedDocId, setSelectedDocId] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allNotes, setAllNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // New Note State
  const [newDocId, setNewDocId] = useState(documents[0]?.id || '');
  const [newNoteText, setNewNoteText] = useState('');
  const [newSelectedText, setNewSelectedText] = useState('');
  const [newPageNumber, setNewPageNumber] = useState('');
  const [newType, setNewType] = useState('note');
  const [newColor, setNewColor] = useState('purple');

  // Edit State
  const [editNoteText, setEditNoteText] = useState('');
  const [editSelectedText, setEditSelectedText] = useState('');
  const [editPageNumber, setEditPageNumber] = useState('');
  const [editType, setEditType] = useState('note');
  const [editColor, setEditColor] = useState('purple');

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load all notes across documents from PostgreSQL
  const fetchAllNotes = async () => {
    try {
      setIsLoading(true);
      const notesAccumulator = [];

      for (const doc of documents) {
        try {
          const res = await getDocumentAnnotations(doc.id);
          const notesWithDoc = (res.annotations || []).map(a => ({
            ...a,
            documentFilename: doc.original_filename
          }));
          notesAccumulator.push(...notesWithDoc);
        } catch (e) {
          // Continue fetching others
        }
      }

      // Sort newest first
      notesAccumulator.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAllNotes(notesAccumulator);
    } catch (err) {
      setErrorMessage('Failed to load notes: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (documents.length > 0) {
      fetchAllNotes();
    } else {
      setIsLoading(false);
    }
  }, [documents.length]);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newDocId) {
      setErrorMessage('Please select a target document.');
      return;
    }
    if (!newNoteText.trim() && !newSelectedText.trim()) {
      setErrorMessage('Please provide note content or reference quote.');
      return;
    }

    try {
      setErrorMessage(null);
      await createAnnotation(newDocId, {
        note_text: newNoteText.trim(),
        selected_text: newSelectedText.trim() || null,
        page_number: newPageNumber ? parseInt(newPageNumber, 10) : null,
        annotation_type: newType,
        color: newColor
      });

      setNewNoteText('');
      setNewSelectedText('');
      setNewPageNumber('');
      setIsCreating(false);
      setSuccessMessage('Note created in PostgreSQL.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAllNotes();
    } catch (err) {
      setErrorMessage('Error creating note: ' + err.message);
    }
  };

  const handleUpdateNote = async (note) => {
    try {
      setErrorMessage(null);
      await updateAnnotation(note.document_id, note.id, {
        note_text: editNoteText.trim(),
        selected_text: editSelectedText.trim() || null,
        page_number: editPageNumber ? parseInt(editPageNumber, 10) : null,
        annotation_type: editType,
        color: editColor
      });

      setEditingId(null);
      setSuccessMessage('Note updated.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAllNotes();
    } catch (err) {
      setErrorMessage('Error updating note: ' + err.message);
    }
  };

  const handleDeleteNote = async (note) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteAnnotation(note.document_id, note.id);
      setAllNotes(prev => prev.filter(n => n.id !== note.id));
      setSuccessMessage('Note deleted.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage('Error deleting note: ' + err.message);
    }
  };

  const startEditing = (note) => {
    setEditingId(note.id);
    setEditNoteText(note.note_text || '');
    setEditSelectedText(note.selected_text || '');
    setEditPageNumber(note.page_number ? String(note.page_number) : '');
    setEditType(note.annotation_type || 'note');
    setEditColor(note.color || 'purple');
  };

  // Filter notes
  const filteredNotes = allNotes.filter((note) => {
    if (selectedDocId !== 'all' && note.document_id !== selectedDocId) {
      return false;
    }
    if (filterType !== 'all' && note.annotation_type !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (note.note_text || '').toLowerCase().includes(q);
      const matchQuote = (note.selected_text || '').toLowerCase().includes(q);
      const matchDoc = (note.documentFilename || '').toLowerCase().includes(q);
      if (!matchText && !matchQuote && !matchDoc) return false;
    }
    return true;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'highlight': return <Highlighter size={13} />;
      case 'question': return <HelpCircle size={13} />;
      case 'summary': return <Bookmark size={13} />;
      case 'todo': return <CheckCircle2 size={13} />;
      default: return <FileText size={13} />;
    }
  };

  return (
    <div className="notes-view-container">
      {/* Hero Header */}
      <div className="notes-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="notes-badge">
              <Bookmark size={14} />
              <span>Workspace Research Repository</span>
            </div>
            <h1 className="notes-title">Notes & Annotations</h1>
            <p className="notes-subtitle">
              Persistent research insights, citations, and questions recorded across all your documents in PostgreSQL.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setIsCreating(!isCreating)}
            style={{ padding: '0.6rem 1.1rem' }}
          >
            {isCreating ? <X size={16} /> : <Plus size={16} />}
            <span>{isCreating ? 'Cancel' : 'New Research Note'}</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="notes-filters-bar">
          <div className="search-filter-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search in notes or quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="notes-select"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
            >
              <option value="all">All Documents ({allNotes.length})</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_filename}
                </option>
              ))}
            </select>

            <select
              className="notes-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="note">General Notes</option>
              <option value="highlight">Highlights / Excerpts</option>
              <option value="question">Questions</option>
              <option value="summary">Key Summaries</option>
              <option value="todo">Action Items</option>
            </select>
          </div>
        </div>
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

      {/* New Note Form */}
      {isCreating && (
        <form onSubmit={handleCreateNote} className="create-note-card" style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0' }}>Add Research Note</h4>

          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Attach to Document *</label>
            <select
              className="form-select"
              value={newDocId}
              onChange={(e) => setNewDocId(e.target.value)}
              required
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_filename}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Note Content *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Write your research insight or commentary..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Reference Quote / Selected Text (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Exact excerpt from the paper..."
              value={newSelectedText}
              onChange={(e) => setNewSelectedText(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Page Number</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 3"
                value={newPageNumber}
                onChange={(e) => setNewPageNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="note">General Note</option>
                <option value="highlight">Highlight</option>
                <option value="question">Question</option>
                <option value="summary">Summary</option>
                <option value="todo">Action Item</option>
              </select>
            </div>
            <div>
              <label className="form-label">Color Theme</label>
              <select
                className="form-select"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              >
                <option value="purple">Purple</option>
                <option value="blue">Blue</option>
                <option value="yellow">Amber</option>
                <option value="green">Emerald</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={15} />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading persistent notes from PostgreSQL...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="notes-empty-state">
          <Bookmark size={40} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
          <h3>No notes match your filters</h3>
          <p>
            {allNotes.length === 0
              ? 'No research notes have been created yet. Add annotations directly while reading documents or click "New Research Note" above.'
              : 'Try clearing your search query or selecting "All Documents" and "All Categories".'}
          </p>
        </div>
      ) : (
        <div className="workspace-notes-grid">
          {filteredNotes.map((note) => {
            const isEditing = editingId === note.id;

            if (isEditing) {
              return (
                <div key={note.id} className="note-card note-card-editing">
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label">Note Content</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label">Reference Quote</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editSelectedText}
                      onChange={(e) => setEditSelectedText(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '0.75rem' }}>
                    <div>
                      <label className="form-label">Page #</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={editPageNumber}
                        onChange={(e) => setEditPageNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                      >
                        <option value="note">General Note</option>
                        <option value="highlight">Highlight</option>
                        <option value="question">Question</option>
                        <option value="summary">Summary</option>
                        <option value="todo">Action Item</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Color</label>
                      <select
                        className="form-select"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                      >
                        <option value="purple">Purple</option>
                        <option value="blue">Blue</option>
                        <option value="yellow">Amber</option>
                        <option value="green">Emerald</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => handleUpdateNote(note)}>
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              );
            }

            const parentDoc = documents.find(d => d.id === note.document_id);

            return (
              <div key={note.id} className={`note-card note-accent-${note.color || 'purple'}`}>
                {/* Document parent banner */}
                <div className="note-parent-doc-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <FileText size={14} color="var(--primary)" />
                    <span className="note-parent-doc-name" title={note.documentFilename}>
                      {note.documentFilename}
                    </span>
                  </div>

                  {parentDoc && (
                    <button
                      className="note-open-doc-link"
                      onClick={() => onOpenDocument(parentDoc)}
                      title="Open this document"
                    >
                      <span>Open</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>

                <div className="note-card-top" style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="note-type-tag">
                      {getTypeIcon(note.annotation_type)}
                      <span style={{ textTransform: 'capitalize' }}>{note.annotation_type || 'note'}</span>
                    </span>
                    {note.page_number && (
                      <span className="note-page-tag">
                        Page {note.page_number}
                      </span>
                    )}
                  </div>

                  <div className="note-actions">
                    <button className="btn-icon" title="Edit note" onClick={() => startEditing(note)}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn-icon btn-icon-danger" title="Delete note" onClick={() => handleDeleteNote(note)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {note.selected_text && (
                  <div className="note-quote-block">
                    "{note.selected_text}"
                  </div>
                )}

                <p className="note-body-text">{note.note_text}</p>

                <div className="note-card-footer">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {new Date(note.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
