import React, { useState } from 'react';
import {
  GitCompare,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Clock,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter
} from 'lucide-react';
import { compareDocuments, getDocumentFileUrl } from '../services/api';

export default function CompareView({ documents = [], onOpenDocument }) {
  const [selectedDocIdA, setSelectedDocIdA] = useState(documents[0]?.id || '');
  const [selectedDocIdB, setSelectedDocIdB] = useState(documents[1]?.id || '');
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('diff'); // 'diff', 'shared', 'unique', 'phrases', 'stats'

  // Diff navigation & filter state
  const [diffFilter, setDiffFilter] = useState('all'); // 'all', 'matches', 'unique_a', 'unique_b'
  const [focusedDiffIndex, setFocusedDiffIndex] = useState(0);

  const handleCompare = async () => {
    if (!selectedDocIdA || !selectedDocIdB) {
      setErrorMessage('Please select two documents to compare.');
      return;
    }

    if (selectedDocIdA === selectedDocIdB) {
      setErrorMessage('Please select two distinct documents. You cannot compare a document with itself.');
      return;
    }

    try {
      setIsComparing(true);
      setErrorMessage(null);
      const data = await compareDocuments([selectedDocIdA, selectedDocIdB]);
      setComparisonData(data);
      setFocusedDiffIndex(0);
      setActiveTab('diff');
    } catch (err) {
      setErrorMessage('Comparison error: ' + err.message);
    } finally {
      setIsComparing(false);
    }
  };

  const docA = documents.find(d => d.id === selectedDocIdA);
  const docB = documents.find(d => d.id === selectedDocIdB);

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Passage differences list
  const allDifferences = comparisonData?.passageComparison?.differences || [];
  const filteredDifferences = allDifferences.filter((d) => {
    if (diffFilter === 'matches') return d.type === 'match';
    if (diffFilter === 'unique_a') return d.type === 'unique_a';
    if (diffFilter === 'unique_b') return d.type === 'unique_b';
    return true;
  });

  const matchesCount = allDifferences.filter(d => d.type === 'match').length;
  const uniqueACount = allDifferences.filter(d => d.type === 'unique_a').length;
  const uniqueBCount = allDifferences.filter(d => d.type === 'unique_b').length;

  const currentDiff = filteredDifferences[focusedDiffIndex];

  const handleNextDiff = () => {
    if (focusedDiffIndex < filteredDifferences.length - 1) {
      setFocusedDiffIndex(focusedDiffIndex + 1);
    } else {
      setFocusedDiffIndex(0);
    }
  };

  const handlePrevDiff = () => {
    if (focusedDiffIndex > 0) {
      setFocusedDiffIndex(focusedDiffIndex - 1);
    } else {
      setFocusedDiffIndex(filteredDifferences.length - 1);
    }
  };

  // Export comparison report as Markdown
  const handleExportReport = () => {
    if (!comparisonData) return;
    const filenameA = comparisonData.comparison?.docAFilename || 'DocA';
    const filenameB = comparisonData.comparison?.docBFilename || 'DocB';
    const jaccard = Math.round((comparisonData.pairwiseComparisons?.[0]?.jaccardSimilarity || 0) * 100);
    const cosine = Math.round((comparisonData.pairwiseComparisons?.[0]?.cosineSimilarity || 0) * 100);

    let md = `# ResearchSpace Document Comparison Report\n\n`;
    md += `**Document A:** ${filenameA}\n`;
    md += `**Document B:** ${filenameB}\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    md += `## Metric Scores\n- **Jaccard Vocabulary Similarity:** ${jaccard}%\n`;
    md += `- **Cosine TF Similarity:** ${cosine}%\n`;
    md += `- **Total Passage Differences:** ${allDifferences.length}\n`;
    md += `- **Shared / Matching Passages:** ${matchesCount}\n`;
    md += `- **Unique to Document A:** ${uniqueACount}\n`;
    md += `- **Unique to Document B:** ${uniqueBCount}\n\n`;

    md += `## Passage Differences\n\n`;
    allDifferences.forEach((diff, i) => {
      md += `### Diff #${i + 1} [${diff.type.toUpperCase()}]\n`;
      if (diff.pageA) md += `- **Page in Doc A:** ${diff.pageA}\n`;
      if (diff.pageB) md += `- **Page in Doc B:** ${diff.pageB}\n`;
      if (diff.textA) md += `> **Doc A:** ${diff.textA}\n\n`;
      if (diff.textB) md += `> **Doc B:** ${diff.textB}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${filenameA}_vs_${filenameB}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="compare-view-container">
      {/* Hero Header */}
      <div className="compare-hero">
        <div className="compare-badge">
          <GitCompare size={14} />
          <span>100% Deterministic Comparison • Zero LLM / API Calls</span>
        </div>
        <h1 className="compare-title">Document Comparison Engine</h1>
        <p className="compare-subtitle">
          Side-by-side lexical analysis comparing shared terminology, distinctive vocabulary, lexical diversity, and passage-level diffs.
        </p>

        {/* Selection Bar */}
        <div className="compare-selection-card">
          <div className="selection-col">
            <label className="selection-label">First Document (Document A)</label>
            <select
              className="selection-select"
              value={selectedDocIdA}
              onChange={(e) => {
                setSelectedDocIdA(e.target.value);
                setComparisonData(null);
              }}
            >
              <option value="">-- Choose Document A --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === selectedDocIdB}>
                  {d.original_filename} ({formatFileSize(d.file_size)})
                </option>
              ))}
            </select>
          </div>

          <div className="compare-vs-divider">
            <span>VS</span>
          </div>

          <div className="selection-col">
            <label className="selection-label">Second Document (Document B)</label>
            <select
              className="selection-select"
              value={selectedDocIdB}
              onChange={(e) => {
                setSelectedDocIdB(e.target.value);
                setComparisonData(null);
              }}
            >
              <option value="">-- Choose Document B --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === selectedDocIdA}>
                  {d.original_filename} ({formatFileSize(d.file_size)})
                </option>
              ))}
            </select>
          </div>

          <div className="selection-action">
            <button
              className="btn btn-primary compare-submit-btn"
              onClick={handleCompare}
              disabled={isComparing || !selectedDocIdA || !selectedDocIdB || selectedDocIdA === selectedDocIdB}
            >
              {isComparing ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Comparing Documents...</span>
                </>
              ) : (
                <>
                  <GitCompare size={16} />
                  <span>Compare Documents</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="alert alert-danger" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparisonData ? (
        <div className="comparison-results">
          {/* Key Metric Cards */}
          <div className="metric-cards-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Jaccard Similarity</span>
                <Percent size={18} color="var(--primary)" />
              </div>
              <div className="metric-value">
                {Math.round((comparisonData.pairwiseComparisons?.[0]?.jaccardSimilarity || 0) * 100)}%
              </div>
              <div className="metric-desc">
                Mathematical overlap of unique vocabulary
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Cosine Similarity</span>
                <TrendingUp size={18} color="var(--accent-teal)" />
              </div>
              <div className="metric-value">
                {Math.round((comparisonData.pairwiseComparisons?.[0]?.cosineSimilarity || 0) * 100)}%
              </div>
              <div className="metric-desc">
                Thematic alignment based on term frequencies
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Passage Diffs</span>
                <Layers size={18} color="var(--accent-purple)" />
              </div>
              <div className="metric-value">
                {allDifferences.length}
              </div>
              <div className="metric-desc">
                {matchesCount} shared, {uniqueACount + uniqueBCount} unique passages
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Shared Terminology</span>
                <CheckCircle2 size={18} color="#10b981" />
              </div>
              <div className="metric-value">
                {comparisonData.comparison?.sharedTerms?.length || 0}
              </div>
              <div className="metric-desc">
                Substantive concepts occurring in both documents
              </div>
            </div>
          </div>

          {/* Side-by-side Document Profiles */}
          <div className="profiles-side-by-side">
            {comparisonData.documents?.map((p, idx) => (
              <div key={p.id} className="profile-card">
                <div className="profile-badge-tag">
                  Document {idx === 0 ? 'A' : 'B'}
                </div>
                <h3 className="profile-title" title={p.originalFilename}>
                  {p.originalFilename}
                </h3>

                <div className="profile-stats-list">
                  <div className="profile-stat-item">
                    <span className="profile-stat-name">Total Word Count</span>
                    <strong className="profile-stat-val">{p.stats.wordCount.toLocaleString()}</strong>
                  </div>
                  <div className="profile-stat-item">
                    <span className="profile-stat-name">Unique Terms</span>
                    <strong className="profile-stat-val">{p.stats.uniqueTermsCount.toLocaleString()}</strong>
                  </div>
                  <div className="profile-stat-item">
                    <span className="profile-stat-name">Lexical Diversity</span>
                    <strong className="profile-stat-val">{Math.round(p.stats.lexicalDiversityRatio * 100)}%</strong>
                  </div>
                  <div className="profile-stat-item">
                    <span className="profile-stat-name">Estimated Reading Time</span>
                    <strong className="profile-stat-val">~{p.stats.readingTimeMinutes} min</strong>
                  </div>
                  <div className="profile-stat-item">
                    <span className="profile-stat-name">File Size</span>
                    <strong className="profile-stat-val">{formatFileSize(p.fileSize)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-secondary profile-open-btn"
                    onClick={() => onOpenDocument(p)}
                  >
                    <span>Open in Workspace</span>
                    <ArrowRight size={14} />
                  </button>

                  <a
                    href={getDocumentFileUrl(p.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary profile-open-btn"
                    title="View Raw PDF in browser tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Breakdowns Tabs */}
          <div className="comparison-tabs-container">
            <div className="comparison-tabs-header">
              <button
                className={`tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
                onClick={() => setActiveTab('diff')}
              >
                <Layers size={15} />
                <span>Passage Diffs & Side-by-Side ({allDifferences.length})</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
                onClick={() => setActiveTab('shared')}
              >
                <span>Shared Terms ({comparisonData.comparison?.sharedTerms?.length || 0})</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'unique' ? 'active' : ''}`}
                onClick={() => setActiveTab('unique')}
              >
                <span>Distinctive Vocabulary</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'phrases' ? 'active' : ''}`}
                onClick={() => setActiveTab('phrases')}
              >
                <span>Matching Phrases ({comparisonData.comparison?.overlappingPhrases?.length || 0})</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                <span>Algorithm & Methodology</span>
              </button>
            </div>

            <div className="comparison-tab-body">
              {/* Premier Side-by-Side Passage Diff Tab */}
              {activeTab === 'diff' && (
                <div className="diff-engine-wrapper">
                  {/* Toolbar */}
                  <div className="diff-toolbar">
                    {/* Navigation Controls */}
                    <div className="diff-nav-controls">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handlePrevDiff}
                        disabled={filteredDifferences.length <= 1}
                        title="Previous difference"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div className="diff-counter-badge">
                        Diff <strong>{filteredDifferences.length > 0 ? focusedDiffIndex + 1 : 0}</strong> of <strong>{filteredDifferences.length}</strong>
                      </div>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleNextDiff}
                        disabled={filteredDifferences.length <= 1}
                        title="Next difference"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Filter Pills */}
                    <div className="diff-filter-group">
                      <button
                        className={`filter-pill ${diffFilter === 'all' ? 'active' : ''}`}
                        onClick={() => { setDiffFilter('all'); setFocusedDiffIndex(0); }}
                      >
                        All ({allDifferences.length})
                      </button>
                      <button
                        className={`filter-pill ${diffFilter === 'matches' ? 'active' : ''}`}
                        onClick={() => { setDiffFilter('matches'); setFocusedDiffIndex(0); }}
                      >
                        Matches ({matchesCount})
                      </button>
                      <button
                        className={`filter-pill ${diffFilter === 'unique_a' ? 'active' : ''}`}
                        onClick={() => { setDiffFilter('unique_a'); setFocusedDiffIndex(0); }}
                      >
                        Unique to A ({uniqueACount})
                      </button>
                      <button
                        className={`filter-pill ${diffFilter === 'unique_b' ? 'active' : ''}`}
                        onClick={() => { setDiffFilter('unique_b'); setFocusedDiffIndex(0); }}
                      >
                        Unique to B ({uniqueBCount})
                      </button>
                    </div>

                    {/* Legend */}
                    <div className="diff-legend-bar">
                      <div className="legend-item">
                        <span className="legend-swatch match" />
                        <span>Shared</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-swatch unique-a" />
                        <span>Unique A</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-swatch unique-b" />
                        <span>Unique B</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-swatch active" />
                        <span>Active</span>
                      </div>
                    </div>

                    {/* Export */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleExportReport}
                      title="Download Markdown comparison report"
                    >
                      <Download size={14} />
                      <span>Export Diff Report</span>
                    </button>
                  </div>

                  {/* Dual Panels */}
                  <div className="dual-diff-panels">
                    {/* Left Column: Document A */}
                    <div className="diff-doc-panel">
                      <div className="diff-doc-header">
                        <div className="diff-doc-header-title">
                          <FileText size={16} color="var(--primary)" />
                          <span title={comparisonData.comparison?.docAFilename}>
                            Doc A: {comparisonData.comparison?.docAFilename}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {uniqueACount} unique passages
                        </span>
                      </div>

                      <div className="diff-passages-list">
                        {filteredDifferences.map((diff, idx) => {
                          const isFocused = idx === focusedDiffIndex;
                          const hasTextA = Boolean(diff.textA);

                          return (
                            <div
                              key={diff.id + '-a'}
                              className={`diff-passage-card ${diff.type} ${isFocused ? 'focused' : ''}`}
                              onClick={() => setFocusedDiffIndex(idx)}
                              style={{ opacity: hasTextA ? 1 : 0.45 }}
                            >
                              <div style={{ fontWeight: 500 }}>
                                {diff.textA ? (
                                  `"${diff.textA}"`
                                ) : (
                                  <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                    (Passage absent in Document A; present only in Document B)
                                  </span>
                                )}
                              </div>

                              <div className="diff-passage-meta">
                                <span className={`diff-badge-indicator ${diff.type}`}>
                                  {diff.type === 'match' ? 'Shared Match' : diff.type === 'unique_a' ? 'Unique to A' : 'Present in B'}
                                </span>
                                {diff.pageA && <span>Page {diff.pageA}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Document B */}
                    <div className="diff-doc-panel">
                      <div className="diff-doc-header">
                        <div className="diff-doc-header-title">
                          <FileText size={16} color="var(--accent-teal)" />
                          <span title={comparisonData.comparison?.docBFilename}>
                            Doc B: {comparisonData.comparison?.docBFilename}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {uniqueBCount} unique passages
                        </span>
                      </div>

                      <div className="diff-passages-list">
                        {filteredDifferences.map((diff, idx) => {
                          const isFocused = idx === focusedDiffIndex;
                          const hasTextB = Boolean(diff.textB);

                          return (
                            <div
                              key={diff.id + '-b'}
                              className={`diff-passage-card ${diff.type} ${isFocused ? 'focused' : ''}`}
                              onClick={() => setFocusedDiffIndex(idx)}
                              style={{ opacity: hasTextB ? 1 : 0.45 }}
                            >
                              <div style={{ fontWeight: 500 }}>
                                {diff.textB ? (
                                  `"${diff.textB}"`
                                ) : (
                                  <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                    (Passage absent in Document B; present only in Document A)
                                  </span>
                                )}
                              </div>

                              <div className="diff-passage-meta">
                                <span className={`diff-badge-indicator ${diff.type}`}>
                                  {diff.type === 'match' ? 'Shared Match' : diff.type === 'unique_b' ? 'Unique to B' : 'Present in A'}
                                </span>
                                {diff.pageB && <span>Page {diff.pageB}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Terminology Tab */}
              {activeTab === 'shared' && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Key terms appearing in both documents, filtered for English stop words and ranked by combined frequency.
                  </p>

                  <div className="terms-table-wrapper">
                    <table className="terms-table">
                      <thead>
                        <tr>
                          <th>Concept / Term</th>
                          <th>In Doc A ({comparisonData.comparison?.docAFilename})</th>
                          <th>In Doc B ({comparisonData.comparison?.docBFilename})</th>
                          <th>Combined Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.comparison?.sharedTerms?.map((st) => (
                          <tr key={st.term}>
                            <td className="term-cell">
                              <strong>{st.term}</strong>
                            </td>
                            <td>{st.countDocA}×</td>
                            <td>{st.countDocB}×</td>
                            <td>
                              <span className="badge badge-uploaded">{st.combinedFrequency} occurrences</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Distinctive Vocabulary Tab */}
              {activeTab === 'unique' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="unique-column">
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                      Unique to "{comparisonData.comparison?.docAFilename}"
                    </h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Terms appearing prominently in Doc A but never in Doc B.
                    </p>
                    <div className="terms-chip-cloud">
                      {comparisonData.comparison?.uniqueToDocA?.map((t) => (
                        <span key={t.term} className="term-chip term-chip-a">
                          {t.term} <small>({t.count}×)</small>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="unique-column">
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                      Unique to "{comparisonData.comparison?.docBFilename}"
                    </h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Terms appearing prominently in Doc B but never in Doc A.
                    </p>
                    <div className="terms-chip-cloud">
                      {comparisonData.comparison?.uniqueToDocB?.map((t) => (
                        <span key={t.term} className="term-chip term-chip-b">
                          {t.term} <small>({t.count}×)</small>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Overlapping Phrases Tab */}
              {activeTab === 'phrases' && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Verbatim Overlapping Key Phrases</h4>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Continuous 4-word sequences containing substantive concepts found in both documents.
                  </p>
                  {(!comparisonData.comparison?.overlappingPhrases || comparisonData.comparison?.overlappingPhrases?.length === 0) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No verbatim 4+ word continuous phrase overlaps detected. The documents discuss related topics using distinct sentence structures.
                    </div>
                  ) : (
                    <div className="overlapping-phrases-list">
                      {comparisonData.comparison.overlappingPhrases.map((p, idx) => (
                        <div key={idx} className="overlapping-phrase-item">
                          <CheckCircle2 size={16} color="var(--primary)" />
                          <span>"{p.phrase}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Algorithm & Methodology Tab */}
              {activeTab === 'stats' && (
                <div className="methodology-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <Info size={18} color="var(--primary)" />
                    <h4 style={{ margin: 0 }}>Deterministic Comparison Methodology</h4>
                  </div>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                    <li>
                      <strong>Zero AI Dependency:</strong> This comparison engine runs completely on your local Node.js server and PostgreSQL, requiring no Gemini API credits.
                    </li>
                    <li>
                      <strong>Passage Alignment:</strong> Sentence and paragraph segmentation aligns related content, classifying shared statements (green) vs isolated unique arguments (red/blue).
                    </li>
                    <li>
                      <strong>Jaccard Similarity:</strong> Computed as <code>|A ∩ B| / |A ∪ B|</code> on non-stop-word vocabulary sets. A measure of shared topical scope.
                    </li>
                    <li>
                      <strong>Cosine TF Similarity:</strong> Computed using normalized term-frequency vectors <code>(v1 · v2) / (||v1|| * ||v2||)</code>, measuring thematic concentration.
                    </li>
                    <li>
                      <strong>Lexical Diversity:</strong> Type-Token Ratio (TTR) measuring vocabulary richness and technical density.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State before comparison */
        <div className="compare-placeholder">
          <GitCompare size={48} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3>Select Two Documents to Compare</h3>
          <p>
            Choose any two documents from the dropdown menus above and click <strong>"Compare Documents"</strong> to compute real-time lexical overlap, passage differences, and shared concepts.
          </p>
        </div>
      )}
    </div>
  );
}
