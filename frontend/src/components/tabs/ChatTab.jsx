import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Loader2,
  FileText,
  Bookmark,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Database,
  ExternalLink
} from 'lucide-react';
import { chatWithDocument, processDocumentRAG } from '../../services/api';

export default function ChatTab({ document }) {
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingRag, setIsProcessingRag] = useState(false);
  const [ragStatus, setRagStatus] = useState(null); // 'ready', 'processing', 'error'
  const [selectedSource, setSelectedSource] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleIndexDocument = async () => {
    if (!document || !document.id) return;
    setIsProcessingRag(true);
    setErrorMessage(null);
    try {
      const res = await processDocumentRAG(document.id);
      setRagStatus('ready');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'system',
          text: `Document indexed successfully (${res.chunksCount} chunks stored in PostgreSQL). You can now ask any question grounded in this document.`
        }
      ]);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process document embeddings.');
    } finally {
      setIsProcessingRag(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const query = inputQuestion.trim();
    if (!query || isLoading) return;

    setInputQuestion('');
    setErrorMessage(null);

    const userMessageId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, type: 'user', text: query }
    ]);

    setIsLoading(true);

    try {
      const res = await chatWithDocument(document.id, query);
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
      setErrorMessage(err.message || 'Failed to generate answer.');
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
    <div className="chat-tab-container">
      {/* Information Header */}
      <div className="chat-header-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            Retrieval-Augmented Q&A (RAG)
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Answers are strictly retrieved and grounded from <strong>{document.original_filename}</strong>
        </span>
      </div>

      {/* Message Thread */}
      <div className="chat-messages-area">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <Database size={32} color="var(--primary)" style={{ opacity: 0.8, marginBottom: '0.75rem' }} />
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Ask anything about this document
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
              Your question will be embedded, semantically matched with relevant chunks in PostgreSQL, and answered using grounded Gemini intelligence.
            </p>

            <div className="chat-suggestion-chips" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="chip-btn"
                onClick={() => {
                  setInputQuestion('What are the key concepts and objectives discussed in this document?');
                }}
              >
                "What are the key concepts and objectives?"
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={() => {
                  setInputQuestion('Summarize the most important findings or topics.');
                }}
              >
                "Summarize the most important findings"
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
                        <span>Source Citations ({msg.sources.length}):</span>
                      </div>
                      <div className="chat-source-pills">
                        {msg.sources.map((src) => (
                          <button
                            key={src.sourceId}
                            type="button"
                            className={`source-pill ${selectedSource?.chunkId === src.chunkId ? 'active' : ''}`}
                            onClick={() => setSelectedSource(src === selectedSource ? null : src)}
                            title="Click to view verified chunk text"
                          >
                            <span>[Source {src.sourceId}]</span>
                            <span>{src.pageNumber ? `Page ${src.pageNumber}` : `Section ${src.chunkIndex + 1}`}</span>
                            <span className="source-sim-score">{Math.round(src.similarity * 100)}% match</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {msg.type === 'system' && (
                <div className="chat-system-message">
                  <CheckCircle size={14} color="var(--primary)" />
                  <span>{msg.text}</span>
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
                Retrieving relevant chunks & formulating grounded answer...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Citation Drawer / Inspector */}
      {selectedSource && (
        <div className="source-inspector-card">
          <div className="source-inspector-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} color="var(--primary)" />
              <strong>
                [Source {selectedSource.sourceId}] {selectedSource.filename}
              </strong>
              <span className="badge badge-uploaded" style={{ fontSize: '0.7rem' }}>
                {selectedSource.pageNumber ? `Page ${selectedSource.pageNumber}` : `Chunk #${selectedSource.chunkIndex}`}
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

      {/* Error alert if any */}
      {errorMessage && (
        <div className="chat-alert-banner">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={handleSendMessage} className="chat-input-bar">
        <input
          type="text"
          className="chat-input-field"
          placeholder="Ask a question grounded in this document..."
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn btn-primary chat-send-btn"
          disabled={!inputQuestion.trim() || isLoading}
        >
          {isLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
