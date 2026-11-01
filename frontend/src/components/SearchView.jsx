import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Calendar,
  HardDrive,
  ArrowRight,
  Sparkles,
  Database,
  Loader2,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { searchFullText } from '../services/api';

export default function SearchView({ onOpenDocument, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const executeSearch = async (searchTerm) => {
    const trimmed = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setIsSearching(true);
      setErrorMessage(null);
      const data = await searchFullText(trimmed);
      setResults(data.results || []);
      setHasSearched(true);
    } catch (err) {
      setErrorMessage('Search error: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    executeSearch();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="search-view-container">
      {/* Search Header */}
      <div className="search-hero">
        <div className="search-badge">
          <Database size={14} />
          <span>PostgreSQL Full-Text Search • Zero AI Quota Consumed</span>
        </div>
        <h1 className="search-title">Advanced Full-Text Search</h1>
        <p className="search-subtitle">
          Search across filenames and extracted text using PostgreSQL native tsvector ranking and keyword snippet extraction.
        </p>

        <form onSubmit={handleSubmit} className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="search-main-input"
            placeholder="Search keywords, concepts, phrases (e.g., 'sensors', 'network', 'learning', 'protocol')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
            >
              ✕
            </button>
          )}
          <button type="submit" className="btn btn-primary search-submit-btn" disabled={isSearching || !query.trim()}>
            {isSearching ? <Loader2 size={16} className="spinner" /> : <Search size={16} />}
            <span>Search</span>
          </button>
        </form>

        {/* Quick query chips */}
        <div className="search-suggestion-chips">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px' }}>Try searching:</span>
          {['data', 'network', 'iot', 'system', 'learning', 'architecture'].map((term) => (
            <button
              key={term}
              type="button"
              className="search-chip"
              onClick={() => {
                setQuery(term);
                executeSearch(term);
              }}
            >
              "{term}"
            </button>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="alert-banner alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* Results Section */}
      <div className="search-results-section">
        {isSearching ? (
          <div className="search-loading">
            <Loader2 size={32} className="spinner" color="var(--primary)" />
            <p>Querying PostgreSQL search indexes & generating highlighted excerpts...</p>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="search-empty">
            <Search size={36} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
            <h3>No matching documents found</h3>
            <p>
              We couldn't find any documents or extracted text matching <strong>"{query}"</strong>.
              Try using different terms, root words, or check spelling.
            </p>
          </div>
        ) : hasSearched ? (
          <div>
            <div className="search-results-header">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Found <strong>{results.length}</strong> {results.length === 1 ? 'document match' : 'document matches'} for <strong>"{query}"</strong>
              </span>
            </div>

            <div className="search-results-list">
              {results.map((item) => (
                <div key={item.id} className="search-result-card">
                  <div className="result-card-header">
                    <div className="result-title-group">
                      <FileText size={20} color="var(--primary)" />
                      <span className="result-filename">{item.originalFilename}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.relevanceScore > 0 && (
                        <span className="result-rank-badge" title="PostgreSQL ts_rank score">
                          Rank {item.relevanceScore}
                        </span>
                      )}
                      <span className={`badge badge-${item.status}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Highlighted Snippet excerpt rendered safely */}
                  <div
                    className="result-snippet"
                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                  />

                  <div className="result-card-footer">
                    <div className="result-meta">
                      <span>
                        <HardDrive size={13} />
                        {formatFileSize(item.fileSize)}
                      </span>
                      <span>
                        <Calendar size={13} />
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {item.hasAnalysis && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--status-analyzed-text)' }}>
                          <CheckCircle2 size={13} />
                          Analysis Available
                        </span>
                      )}
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenDocument(item)}
                    >
                      <span>Open Document</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="search-intro">
            <Database size={40} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
            <h3>High-Performance Deterministic Search</h3>
            <p>
              Type any query above to perform real-time, dictionary-stemmed PostgreSQL full-text search.
              All matching terms are highlighted in contextual excerpts without requiring AI model credits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
