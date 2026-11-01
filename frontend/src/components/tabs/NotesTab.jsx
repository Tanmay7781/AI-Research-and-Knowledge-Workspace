import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Bookmark,
  Calendar,
  Tag,
  CheckCircle2,
  HelpCircle,
  Highlighter,
  MessageSquare
} from 'lucide-react';
import {
  getDocumentAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation
} from '../../services/api';

export default function NotesTab({ document }) {
  const [annotations, setAnnotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // New Note Form State
  const [newNoteText, setNewNoteText] = useState('');
  const [newSelectedText, setNewSelectedText] = useState('');
  const [newPageNumber, setNewPageNumber] = useState('');
  const [newType, setNewType] = useState('note');
  const [newColor, setNewColor] = useState('purple');

  // Edit Note Form State
  const [editNoteText, setEditNoteText] = useState('');
  const [editSelectedText, setEditSelectedText] = useState('');
  const [editPageNumber, setEditPageNumber] = useState('');
  const [editType, setEditType] = useState('note');
  const [editColor, setEditColor] = useState('purple');

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch annotations from PostgreSQL on document change
  const fetchNotes = async () => {
    if (!document?.id) return;
    try {
      setIsLoading(true);
      const res = await getDocumentAnnotations(document.id);
      setAnnotations(res.annotations || []);
    } catch (err) {
      setErrorMessage('Failed to load notes from database: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [document?.id]);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() && !newSelectedText.trim()) {
      setErrorMessage('Please provide note content or excerpt.');
      return;
    }

    try {
      setErrorMessage(null);
      await createAnnotation(document.id, {
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
      setSuccessMessage('Note saved to PostgreSQL.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchNotes();
    } catch (err) {
      setErrorMessage('Error creating note: ' + err.message);
    }
  };

  const startEditing = (ann) => {
    setEditingId(ann.id);
    setEditNoteText(ann.note_text || '');
    setEditSelectedText(ann.selected_text || '');
    setEditPageNumber(ann.page_number ? String(ann.page_number) : '');
    setEditType(ann.annotation_type || 'note');
    setEditColor(ann.color || 'purple');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdateNote = async (annId) => {
    try {
      setErrorMessage(null);
      await updateAnnotation(document.id, annId, {
        note_text: editNoteText.trim(),
        selected_text: editSelectedText.trim() || null,
        page_number: editPageNumber ? parseInt(editPageNumber, 10) : null,
        annotation_type: editType,
        color: editColor
      });

      setEditingId(null);
      setSuccessMessage('Note updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchNotes();
    } catch (err) {
      setErrorMessage('Error updating note: ' + err.message);
    }
  };

  const handleDeleteNote = async (annId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      setErrorMessage(null);
      await deleteAnnotation(document.id, annId);
      setAnnotations((prev) => prev.filter((a) => a.id !== annId));
      setSuccessMessage('Note deleted.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage('Error deleting note: ' + err.message);
    }
  };

  const filteredAnnotations = filterType === 'all'
    ? annotations
    : annotations.filter((a) => a.annotation_type === filterType);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'highlight': return <Highlighter size={14} />;
      case 'question': return <HelpCircle size={14} />;
      case 'summary': return <Bookmark size={14} />;
      case 'todo': return <CheckCircle2 size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div className="notes-tab-container">
      {/* Header Bar */}
      <div className="notes-header-bar">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Notes & Annotations ({annotations.length})
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Persistent research notes and citations saved in PostgreSQL for <strong>{document.original_filename}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Type Filter */}
          <select
            className="form-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
          >
            <option value="all">All Types ({annotations.length})</option>
            <option value="note">General Notes</option>
            <option value="highlight">Highlights / Passages</option>
            <option value="question">Questions</option>
            <option value="summary">Key Summaries</option>
            <option value="todo">Action Items / To-Do</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={() => setIsCreating(!isCreating)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            {isCreating ? <X size={15} /> : <Plus size={15} />}
            <span>{isCreating ? 'Cancel' : 'Add Note'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
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

      {/* Create Note Drawer / Card */}
      {isCreating && (
        <form onSubmit={handleCreateNote} className="create-note-card">
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Create Research Note</h4>

          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Note Content *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Write your research insight, analysis commentary, or question..."
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
              placeholder="e.g. Verbatim excerpt from document..."
              value={newSelectedText}
              onChange={(e) => setNewSelectedText(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Page Number (Optional)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 5"
                value={newPageNumber}
                onChange={(e) => setNewPageNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Annotation Category</label>
              <select
                className="form-select"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="note">General Note</option>
                <option value="highlight">Highlight / Citation</option>
                <option value="question">Question</option>
                <option value="summary">Summary</option>
                <option value="todo">Action Item</option>
              </select>
            </div>

            <div>
              <label className="form-label">Color Accent</label>
              <select
                className="form-select"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              >
                <option value="purple">Purple Accent</option>
                <option value="blue">Blue Accent</option>
                <option value="yellow">Amber Accent</option>
                <option value="green">Emerald Accent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={15} />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading persistent notes from PostgreSQL...
        </div>
      ) : filteredAnnotations.length === 0 ? (
        <div className="notes-empty-state">
          <Bookmark size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
          <h4>No notes recorded yet</h4>
          <p>
            Add notes, highlight key passages, track research questions, or record summaries for this document.
            All annotations are stored in PostgreSQL and persist across sessions.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreating(true)}
            style={{ marginTop: '0.75rem' }}
          >
            <Plus size={15} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="notes-list-grid">
          {filteredAnnotations.map((ann) => {
            const isEditing = editingId === ann.id;

            if (isEditing) {
              return (
                <div key={ann.id} className="note-card note-card-editing">
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
                    <button className="btn btn-secondary" onClick={cancelEditing}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => handleUpdateNote(ann.id)}>
                      <Save size={14} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={ann.id} className={`note-card note-accent-${ann.color || 'purple'}`}>
                <div className="note-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="note-type-tag">
                      {getTypeIcon(ann.annotation_type)}
                      <span style={{ textTransform: 'capitalize' }}>{ann.annotation_type || 'note'}</span>
                    </span>
                    {ann.page_number && (
                      <span className="note-page-tag">
                        Page {ann.page_number}
                      </span>
                    )}
                  </div>

                  <div className="note-actions">
                    <button
                      className="btn-icon"
                      title="Edit note"
                      onClick={() => startEditing(ann)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      title="Delete note"
                      onClick={() => handleDeleteNote(ann.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Selected Text / Excerpt Block */}
                {ann.selected_text && (
                  <div className="note-quote-block">
                    "{ann.selected_text}"
                  </div>
                )}

                {/* Note Text */}
                <p className="note-body-text">{ann.note_text}</p>

                <div className="note-card-footer">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {new Date(ann.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {ann.updated_at && ann.updated_at !== ann.created_at && (
                    <span style={{ fontStyle: 'italic', opacity: 0.8 }}>Edited</span>
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
