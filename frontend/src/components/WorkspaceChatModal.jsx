import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Send,
  Loader2,
  Bookmark,
  FileText,
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { chatWithWorkspace } from '../services/api';

export default function WorkspaceChatModal({ isOpen, onClose, documents = [] }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = question.trim();
    if (!query || isLoading) return;

    setQuestion('');
    setErrorMessage(null);

    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, type: 'user', text: query }
    ]);

    setIsLoading(true);

    try {
      const res = await chatWithWorkspace(query);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'assistant',
          text: res.answer,
          sources: res.sources || [],
          hasAnswer: res.hasAnswer
        }
      ]);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to search workspace.');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'error',
          text: `Error: ${err.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card workspace-chat-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', height: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="var(--primary)" />
              <h2 className="modal-title">Workspace Multi-Document Chat</h2>
            </div>
            <p className="modal-subtitle">
              Retrieves grounded information across {documents.length} document{documents.length !== 1 ? 's' : ''} in your workspace.
            </p>
          </div>
          <button className="btn-icon-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Messages Body */}
        <div className="chat-messages-area" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {messages.length === 0 ? (
            <div className="chat-empty-state" style={{ padding: '3rem 1rem' }}>
              <Sparkles size={32} color="var(--primary)" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
              <h4>Cross-Document Semantic Search & Q&A</h4>
              <p style={{ maxWidth: '460px', margin: '0 auto', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Ask questions across all documents in your library. Sources will be cited with the exact document name, page, and chunk.
              </p>
              <div className="chat-suggestion-chips" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setQuestion('What are the main topics discussed across the uploaded documents?')}
                >
                  "What are the main topics discussed across documents?"
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message-${msg.type}`}>
                {msg.type === 'user' && (
                  <div className="chat-bubble chat-bubble-user">
                    <div className="chat-text">{msg.text}</div>
                  </div>
                )}

                {msg.type === 'assistant' && (
                  <div className="chat-bubble chat-bubble-assistant">
                    <div className="chat-text markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="chat-sources-block">
                        <div className="chat-sources-title">
                          <Bookmark size={13} />
                          <span>Sources ({msg.sources.length}):</span>
                        </div>
                        <div className="chat-source-pills">
                          {msg.sources.map((src) => (
                            <button
                              key={src.sourceId}
                              type="button"
                              className={`source-pill ${selectedSource?.chunkId === src.chunkId ? 'active' : ''}`}
                              onClick={() => setSelectedSource(src === selectedSource ? null : src)}
                            >
                              <FileText size={11} />
                              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {src.filename}
                              </span>
                              <span>{src.pageNumber ? `(p. ${src.pageNumber})` : `(#${src.chunkIndex})`}</span>
                              <span className="source-sim-score">{Math.round(src.similarity * 100)}%</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {msg.type === 'error' && (
                  <div className="chat-error-message">
                    <AlertCircle size={14} color="var(--status-failed-text)" />
                    <span>{msg.text}</span>
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="chat-message chat-message-assistant">
              <div className="chat-bubble chat-bubble-assistant loading-bubble">
                <Loader2 size={16} className="spinner" color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Searching across workspace documents & grounding response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Source Drawer */}
        {selectedSource && (
          <div className="source-inspector-card" style={{ margin: '0 1.25rem 0.5rem 1.25rem' }}>
            <div className="source-inspector-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} color="var(--primary)" />
                <strong>{selectedSource.filename}</strong>
                <span className="badge badge-uploaded" style={{ fontSize: '0.7rem' }}>
                  {selectedSource.pageNumber ? `Page ${selectedSource.pageNumber}` : `Chunk #${selectedSource.chunkIndex}`}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({Math.round(selectedSource.similarity * 100)}% similarity)
                </span>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setSelectedSource(null)}
              >
                ✕
              </button>
            </div>
            <div className="source-inspector-body">
              <p className="source-inspector-text">
                "{selectedSource.fullContent || selectedSource.excerpt}"
              </p>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="chat-input-bar"
          style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}
        >
          <input
            type="text"
            className="chat-input-field"
            placeholder="Ask a question across all documents..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary chat-send-btn"
            disabled={!question.trim() || isLoading}
          >
            {isLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
