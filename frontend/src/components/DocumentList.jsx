import React from 'react';
import DocumentCard from './DocumentCard';

export default function DocumentList({
  documents = [],
  onOpenDocument,
  onAnalyzeDocument,
  onDeleteDocument,
  analyzingDocIds = []
}) {
  return (
    <div className="document-grid">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onOpenDocument={onOpenDocument}
          onAnalyzeDocument={onAnalyzeDocument}
          onDeleteDocument={onDeleteDocument}
          isAnalyzing={analyzingDocIds.includes(doc.id)}
        />
      ))}
    </div>
  );
}
