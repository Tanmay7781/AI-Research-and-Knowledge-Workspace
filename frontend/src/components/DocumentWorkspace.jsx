import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Tag,
  Layers,
  Loader2,
  AlertCircle
} from 'lucide-react';
import OverviewTab from './tabs/OverviewTab';
import KeyPointsTab from './tabs/KeyPointsTab';
import FlashcardsTab from './tabs/FlashcardsTab';
import QuizTab from './tabs/QuizTab';
import ImportantTermsTab from './tabs/ImportantTermsTab';

export default function DocumentWorkspace({
  document,
  onAnalyzeDocument,
  isAnalyzing
}) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!document) return null;

  const analysis = document.analysis;
  const isAnalyzed = Boolean(analysis);
  const isFailed = document.status === 'failed';
  const isProcessing = isAnalyzing || document.status === 'processing';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'keypoints', label: 'Key Points', icon: CheckCircle2 },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
    { id: 'terms', label: 'Important Terms', icon: Tag }
  ];

  return (
    <div className="doc-workspace">
      {/* Header */}
      <div className="doc-workspace-header">
        <div className="doc-workspace-title-group">
          <FileText size={22} color="var(--primary)" />
          <div>
            <div className="doc-workspace-title">{document.original_filename}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Status: <strong style={{ textTransform: 'capitalize' }}>{document.status}</strong>
            </div>
          </div>
        </div>

        <div>
          {!isAnalyzed && (
            <button
              className="btn btn-primary"
              onClick={() => onAnalyzeDocument(document.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Analysing document...</span>
                </>
              ) : isFailed ? (
                <>
                  <Sparkles size={16} />
                  <span>Retry Analysis</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Analyse Document</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* If analyzed: show tabs navigation */}
      {isAnalyzed && (
        <div className="workspace-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Body Area */}
      <div className="tab-pane">
        {isAnalyzed ? (
          <>
            {activeTab === 'overview' && <OverviewTab analysis={analysis} />}
            {activeTab === 'keypoints' && <KeyPointsTab analysis={analysis} />}
            {activeTab === 'flashcards' && <FlashcardsTab analysis={analysis} />}
            {activeTab === 'quiz' && <QuizTab analysis={analysis} />}
            {activeTab === 'terms' && <ImportantTermsTab analysis={analysis} />}
          </>
        ) : isProcessing ? (
          <div className="unanalyzed-banner">
            <Loader2 size={36} className="spinner" color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3>Analysing document...</h3>
            <p>
              Extracting text and generating structured intelligence via Gemini API. This may take a few moments.
            </p>
          </div>
        ) : isFailed ? (
          <div className="unanalyzed-banner">
            <AlertCircle size={36} color="var(--status-failed-text)" style={{ marginBottom: '1rem' }} />
            <h3>Analysis Generation Failed</h3>
            <p>
              The document analysis could not be generated. Check your backend logs or Gemini API key configuration and try again.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => onAnalyzeDocument(document.id)}
            >
              Retry Analysis
            </button>
          </div>
        ) : (
          <div className="unanalyzed-banner">
            <Sparkles size={36} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3>This document has not been analysed yet.</h3>
            <p>
              Run AI analysis to extract summaries, key takeaways, flashcards, quiz questions, and essential terminology.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => onAnalyzeDocument(document.id)}
            >
              Analyse Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
