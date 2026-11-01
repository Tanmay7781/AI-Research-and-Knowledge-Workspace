import React from 'react';
import {
  Sparkles,
  GitCompare,
  FileText,
  Search,
  Bookmark,
  History,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Database,
  Moon,
  Sun,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function LandingPage({
  onLaunchWorkspace,
  onOpenCompare,
  onOpenSearch,
  theme,
  onToggleTheme,
  documentCount = 0
}) {
  return (
    <div className="landing-container">
      {/* Background Radial Glow */}
      <div className="landing-glow-bg" />

      {/* Navigation Bar */}
      <nav className="landing-navbar">
        <div className="landing-nav-brand" onClick={onLaunchWorkspace}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)'
          }}>
            <Sparkles size={18} />
          </div>
          <span>ResearchSpace</span>
        </div>

        <div className="landing-nav-links">
          <button className="landing-nav-link" onClick={() => {
            const el = document.getElementById('features-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            Features
          </button>
          <button className="landing-nav-link" onClick={onOpenCompare}>
            Comparison Engine
          </button>
          <button className="landing-nav-link" onClick={onOpenSearch}>
            Full-Text Search
          </button>

          {/* Theme Toggle Button */}
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

          <button className="btn btn-primary" onClick={onLaunchWorkspace}>
            <span>Launch Workspace</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-badge">
          <Sparkles size={14} />
          <span>Next-Generation AI Document Intelligence & Grounded RAG</span>
        </div>

        <h1 className="landing-title">
          Transform Research Papers Into <br />
          <span className="landing-title-gradient">Connected Intelligence</span>
        </h1>

        <p className="landing-subtitle">
          An enterprise-grade workspace for researchers and engineers. Extract structured insights, 
          compare academic documents with passage-level diffs, search with PostgreSQL full-text vectors, 
          and highlight PDFs with persistent annotations.
        </p>

        <div className="landing-cta-group">
          <button className="landing-btn-primary" onClick={onLaunchWorkspace}>
            <Zap size={18} />
            <span>Open Research Workspace</span>
            <ArrowRight size={18} />
          </button>

          <button className="landing-btn-secondary" onClick={onOpenCompare}>
            <GitCompare size={18} color="var(--primary)" />
            <span>Explore Diff Engine</span>
          </button>
        </div>

        {/* Live System Metrics Widget */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '0.65rem 1.25rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '9999px',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)' }}>PostgreSQL:</span>
            <strong style={{ color: 'var(--text-primary)' }}>Connected</strong>
          </div>
          <div style={{ width: 1, height: 14, backgroundColor: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={14} color="var(--accent-purple)" />
            <span style={{ color: 'var(--text-muted)' }}>AI RAG:</span>
            <strong style={{ color: 'var(--text-primary)' }}>Gemini Active</strong>
          </div>
          <div style={{ width: 1, height: 14, backgroundColor: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <FileText size={14} color="var(--primary)" />
            <span style={{ color: 'var(--text-muted)' }}>Library:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{documentCount} Documents</strong>
          </div>
        </div>
      </section>

      {/* Futuristic Interactive Preview Box */}
      <section className="landing-preview-card">
        <div className="preview-window">
          <div className="preview-window-header">
            <div className="preview-dots">
              <div className="preview-dot dot-red" />
              <div className="preview-dot dot-yellow" />
              <div className="preview-dot dot-green" />
            </div>
            <span className="preview-window-title">ResearchSpace Dual-Diff & PDF Intelligence Engine</span>
            <div style={{ width: 40 }} />
          </div>

          <div className="preview-window-body">
            <div className="preview-feature-card">
              <div className="pfc-icon" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                <GitCompare size={20} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                Passage-Level Diff Engine
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Side-by-side color-coded alignment. Highlights shared conceptual passages in green, 
                document-specific sections in red/blue, and active diffs in amber.
              </p>
            </div>

            <div className="preview-feature-card">
              <div className="pfc-icon" style={{ backgroundColor: 'var(--accent-purple-subtle)', color: 'var(--accent-purple)' }}>
                <Bookmark size={20} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                Persistent PDF Reader & Notes
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Native canvas rendering with 4-color highlighting. Annotations and context snippets 
                are saved in PostgreSQL with a dedicated rapid revision mode.
              </p>
            </div>

            <div className="preview-feature-card">
              <div className="pfc-icon" style={{ backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)' }}>
                <Search size={20} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                Deterministic Full-Text Search
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                PostgreSQL tsvector indexing with headline snippet generation and page rank scoring. 
                Instant sub-millisecond cross-document search.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features-section" className="landing-features-section">
        <div className="section-header">
          <div className="section-badge">Architecture & Capabilities</div>
          <h2 className="section-title">Designed for Serious Research</h2>
          <p className="section-subtitle">
            Combines deterministic algorithms with modern generative AI for reliable, reproducible knowledge discovery.
          </p>
        </div>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-box">
            <div className="feature-box-icon">
              <Sparkles size={24} />
            </div>
            <h3 className="feature-box-title">Document Intelligence</h3>
            <p className="feature-box-desc">
              Automatic extraction of executive summaries, key takeaways, active-recall flashcards, 
              interactive quizzes, and domain-specific terminology.
            </p>
            <div className="feature-box-tags">
              <span className="feature-tag">Gemini 1.5 Pro</span>
              <span className="feature-tag">Structured JSON</span>
              <span className="feature-tag">Flashcards</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="feature-box">
            <div className="feature-box-icon" style={{ backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)' }}>
              <GitCompare size={24} />
            </div>
            <h3 className="feature-box-title">Lexical Comparison & Diffs</h3>
            <p className="feature-box-desc">
              Mathematical similarity scoring via Jaccard and Cosine Term-Frequency. Dual-panel passage comparison 
              instantly reveals overlaps and contradictions.
            </p>
            <div className="feature-box-tags">
              <span className="feature-tag">Jaccard Index</span>
              <span className="feature-tag">Cosine TF</span>
              <span className="feature-tag">Passage Diff</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="feature-box">
            <div className="feature-box-icon" style={{ backgroundColor: 'var(--accent-purple-subtle)', color: 'var(--accent-purple)' }}>
              <Bookmark size={24} />
            </div>
            <h3 className="feature-box-title">PDF Reader & Highlights</h3>
            <p className="feature-box-desc">
              Full-fledged in-browser PDF reader with text layer selection, multi-color highlighting (yellow, green, blue, pink), 
              attached notes, and flashcard revision mode.
            </p>
            <div className="feature-box-tags">
              <span className="feature-tag">PDF.js Canvas</span>
              <span className="feature-tag">4 Color Themes</span>
              <span className="feature-tag">Revision Mode</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="feature-box">
            <div className="feature-box-icon" style={{ backgroundColor: 'var(--accent-amber-subtle)', color: 'var(--accent-amber)' }}>
              <Search size={24} />
            </div>
            <h3 className="feature-box-title">PostgreSQL Full-Text Search</h3>
            <p className="feature-box-desc">
              Deterministic PostgreSQL tsvector and tsquery with rank scoring and highlighted snippet headlines 
              across all indexed research documents.
            </p>
            <div className="feature-box-tags">
              <span className="feature-tag">GIN Index</span>
              <span className="feature-tag">ts_headline</span>
              <span className="feature-tag">Page Citations</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="feature-box">
            <div className="feature-box-icon">
              <History size={24} />
            </div>
            <h3 className="feature-box-title">SHA-256 Duplicates & Versions</h3>
            <p className="feature-box-desc">
              Cryptographic duplicate detection prevents accidental re-uploads. Full document version tracking 
              allows uploading revisions and rolling back anytime.
            </p>
            <div className="feature-box-tags">
              <span className="feature-tag">SHA-256 Hashing</span>
              <span className="feature-tag">Version Rollback</span>
              <span className="feature-tag">Audit Trail</span>
            </div>
          </div>

          {/* Card 6 */}
          <div className="feature-box">
            <div className="feature-box-icon" style={{ backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)' }}>
              <MessageSquare size={24} />
            </div>
            <h3 className="feature-box-title">Grounded RAG Chat</h3>
            <p className="feature-box-desc">
              Converse with individual papers or query your entire library simultaneously. Every AI statement 
              is backed by strict page citations and source snippets.
            </p>
            <div className="feature-box-tags">
              <span className="feature-tag">Multi-Doc RAG</span>
              <span className="feature-tag">Page Citations</span>
              <span className="feature-tag">Hallucination Guard</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} color="var(--primary)" />
          <strong style={{ color: 'var(--text-primary)' }}>ResearchSpace</strong>
          <span>— AI-Powered Document Intelligence</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="landing-nav-link" onClick={onLaunchWorkspace}>
            Workspace
          </button>
          <button className="landing-nav-link" onClick={onOpenCompare}>
            Comparison
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onLaunchWorkspace}>
            Open App
          </button>
        </div>
      </footer>
    </div>
  );
}
