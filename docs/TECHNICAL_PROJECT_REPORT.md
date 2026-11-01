# Technical Project Report: AI Research and Knowledge Workspace (ResearchSpace)

**Project Title:** Design and Development of an AI-Powered Document Intelligence and Knowledge Management System Using Retrieval-Augmented Generation (RAG)  
**System Brand:** ResearchSpace  
**Date of Report:** November 1, 2026  
**Status:** Fully Implemented, Integrated, and Verified  

---

## Executive Summary

The **AI Research and Knowledge Workspace** (branded as **ResearchSpace**) is a full-stack, enterprise-grade research and document intelligence platform. It bridges the gap between passive document storage and active knowledge discovery by integrating:
1. **Google Gemini Generative AI (1.5 Flash / 1.5 Pro)** for automated executive summaries, key takeaways, active-recall flashcards, knowledge testing quizzes, and technical terminology extraction.
2. **Deterministic PostgreSQL Full-Text Search (FTS)** using native `tsvector` and `tsquery` with GIN indexing, rank scoring, and highlighted snippet extraction (`ts_headline`) without requiring external search clusters.
3. **Dual-Panel Passage Comparison Engine** operating on 100% deterministic lexical algorithms (Jaccard Vocabulary Index, Cosine Term-Frequency similarity, N-Gram phrase matching, and page-aligned passage diff detection) requiring zero LLM credits.
4. **Persistent In-Browser PDF Reader** powered by PDF.js with text-layer selection, 4-color highlighting (yellow, green, blue, pink), attached reflection notes, and a rapid Flash Revision Mode.
5. **Grounded Document and Cross-Workspace RAG** with vector embeddings, cosine distance ranking, and strict page/chunk-level citations that eliminate AI hallucination.
6. **Integrity & Version Control** featuring cryptographic SHA-256 duplicate detection and full version rollback tracking in PostgreSQL.

---

## 1. System Architecture & High-Level Design

The system adheres to a layered microservices-oriented monolithic architecture with strict separation of concerns:

```
[ Client Layer: React 18 + Vite (Port 5173) ]
     │  ▲
     │  │ HTTP Range Streaming (206) & REST JSON
     ▼  │
[ API Gateway & Server: Express.js + Node.js (Port 3000) ]
     │            │                    │
     ▼            ▼                    ▼
[ AI Service ]  [ Native Lexical ]   [ Database: PostgreSQL (Port 5432) ]
(Gemini 1.5 &   (Jaccard, Cosine TF, (Documents, Chunks, Embeddings,
Embeddings)     Passage Diff Engine)  Analyses, Annotations, Versions)
```

### Core Architecture Components

1. **Frontend Presentation Tier (`frontend/`)**:
   - Single Page Application built with React 18, Vite, and custom CSS design tokens.
   - Comprehensive Dark and Light Theme system driven by CSS variables (`data-theme="dark"` / `data-theme="light"`).
   - In-browser PDF canvas renderer and overlay text layer with direct arrayBuffer streaming.
   - Dual-view side-by-side diff workspace with passage navigation, filtering, and Markdown report export.
   - Responsive multi-document chat modal with scrollable message thread and attached bottom input bar.

2. **Backend Application Tier (`backend/`)**:
   - Node.js & Express REST API server providing centralized routing, error handling, file streaming, and authentication hooks.
   - HTTP Range Request (`206 Partial Content`) controller for instant PDF navigation and chunk delivery.
   - Safe configuration detection protecting user API keys and database credentials from leaking in logs.

3. **AI Processing Tier (`ai-service/`)**:
   - Encapsulated service module interacting with `@google/generative-ai` (`gemini-1.5-flash` and `text-embedding-004`).
   - Strict 1:1 analysis caching guard: inspects PostgreSQL prior to any Gemini call to eliminate redundant API billing.
   - Robust JSON extraction utilizing schema sanitization, markdown fence removal, and structural validation.

4. **Persistence Tier (PostgreSQL 15+)**:
   - Relational database with UUID primary keys generated via `pgcrypto` (`gen_random_uuid()`).
   - Native tsvector column with GIN index for sub-millisecond lexical queries.
   - `real[]` array storage with plpgsql cosine similarity function for portable vector search without external plugins.

---

## 2. Directory Structure & File Organization

```
AI Research and Knowledge Workspace/
├── .env                              # Root configuration (GEMINI_API_KEY, DB credentials)
├── .env.example                      # Template configuration
├── README.md                         # Comprehensive project documentation
├── GEMINI_API_DIAGNOSTIC_REPORT.pdf  # Diagnostic health report
├── docs/                             # Technical reports and documentation
│   ├── TECHNICAL_PROJECT_REPORT.md   # Complete technical documentation
│   └── TECHNICAL_PROJECT_REPORT.pdf  # Formal compiled project report
│
├── ai-service/                       # Encapsulated AI Processing Module
│   ├── package.json                  # AI service dependencies (@google/generative-ai, pdf-parse)
│   ├── test.js                       # Standalone AI diagnostic & test script
│   └── src/
│       ├── index.js                  # Module exports and high-level interface
│       ├── pdfParser.js              # Robust PDF text extraction via pdf-parse
│       ├── geminiClient.js           # Gemini model initialization and prompt engineering
│       └── ragService.js             # Chunking, embedding generation, and cosine scoring
│
├── backend/                          # Express.js REST API & Persistence
│   ├── package.json                  # Dependencies (express, pg, cors, multer, dotenv, pdfkit)
│   ├── schema.sql                    # PostgreSQL schema definition, tables, functions, & indexes
│   ├── test_regression.js            # End-to-end regression & verification test suite
│   ├── test_versions.js              # Document version tracking test
│   ├── uploads/                      # Physical storage directory for uploaded PDFs
│   └── src/
│       ├── index.js                  # Server entry point, CORS configuration, & health routes
│       ├── db.js                     # PostgreSQL connection pool with retry resilience
│       ├── middleware/
│       │   ├── upload.js             # Multer diskStorage with UUID file renaming
│       │   └── errorHandler.js       # Centralized JSON error response handler
│       ├── controllers/
│       │   ├── documentController.js # Upload, listing, detail, analyze, delete, range file serve
│       │   ├── ragController.js      # Vector processing, single-doc chat, multi-doc chat
│       │   ├── searchController.js   # Native PostgreSQL tsvector / tsquery full-text search
│       │   ├── comparisonController.js# Deterministic Jaccard, Cosine, & passage diff engine
│       │   ├── annotationController.js# Highlights, notes CRUD, and revision flashcards
│       │   └── versionController.js  # SHA-256 duplicate checking, version upload, restore
│       └── routes/
│           ├── documentRoutes.js     # REST API route mappings
│           └── workspaceRoutes.js    # Workspace management routes
│
└── frontend/                         # React 18 + Vite User Interface
    ├── package.json                  # Dependencies (react, lucide-react, react-markdown, pdfjs-dist)
    ├── vite.config.js                # Vite build and asset bundler configuration
    ├── index.html                    # HTML entry point with modern typography
    └── src/
        ├── main.jsx                  # React DOM mount point
        ├── App.jsx                   # Master state management, routing, theme provider
        ├── index.css                 # Universal design tokens, CSS variables, dark/light themes
        ├── services/
        │   └── api.js                # Client API bridge for all REST endpoints
        └── components/
            ├── LandingPage.jsx       # Futuristic landing showcase with live metrics & preview
            ├── WorkspaceHeader.jsx   # Top navigation, breadcrumbs, search bar, theme toggle
            ├── Sidebar.jsx           # Workspace navigation, document counts, server status
            ├── DocumentList.jsx      # Library view grid with selection checkboxes
            ├── DocumentCard.jsx      # Document card with SHA tag, status badge, metadata
            ├── DocumentWorkspace.jsx # Document detail workspace container & tab orchestrator
            ├── SearchView.jsx        # Full-text search with live rank badges & highlights
            ├── CompareView.jsx       # Dual-panel passage comparison with export
            ├── NotesView.jsx         # Library-wide notes repository and search
            ├── UploadModal.jsx       # Drag-and-drop modal with duplicate detection dialog
            ├── WorkspaceChatModal.jsx# Multi-document grounded RAG chat modal
            ├── LoadingState.jsx      # Modern loading state indicators
            ├── ErrorAlert.jsx        # Dismissible error banner
            ├── EmptyState.jsx        # Guided upload state for empty workspaces
            ├── pdf/
            │   ├── PdfReader.jsx     # Canvas + textLayer reader with 4-color highlighting
            │   └── RevisionModeModal.jsx# Step-by-step flashcard review mode
            └── tabs/
                ├── OverviewTab.jsx   # Document executive summary view
                ├── KeyPointsTab.jsx  # Structured takeaways with bullet points
                ├── FlashcardsTab.jsx # Interactive 3D flip study flashcards
                ├── QuizTab.jsx       # Multiple choice quiz with instant feedback
                ├── ImportantTermsTab.jsx# Domain vocabulary cards with definitions
                ├── ChatTab.jsx       # Single-document grounded RAG conversation
                ├── NotesTab.jsx      # Document-specific notes and annotations
                └── VersionsTab.jsx   # Version history timeline with rollback action
```

---

## 3. Database Schema & Persistence Design

The database schema (`backend/schema.sql`) utilizes standard PostgreSQL 15+ without requiring external plugins or non-portable binary extensions.

### Database Tables Specification

1. **`workspaces`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES users(id) ON DELETE CASCADE`
   - `name VARCHAR(255) NOT NULL DEFAULT 'Default Workspace'`
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

2. **`documents`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL`
   - `original_filename VARCHAR(255) NOT NULL`
   - `stored_filename VARCHAR(255) NOT NULL`
   - `file_path TEXT NOT NULL`
   - `file_size BIGINT`
   - `mime_type VARCHAR(255) DEFAULT 'application/pdf'`
   - `extracted_text TEXT`
   - `status VARCHAR(50) NOT NULL DEFAULT 'uploaded'` ('uploaded', 'processing', 'analyzed', 'failed')
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - `analyzed_at TIMESTAMP WITH TIME ZONE`
   - `file_sha256 VARCHAR(64)`
   - `search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', COALESCE(extracted_text, ''))) STORED`

3. **`document_analyses`** (Enforces strict 1:1 relationship with duplicate protection):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `document_id UUID UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE`
   - `summary TEXT`
   - `key_points JSONB NOT NULL DEFAULT '[]'::jsonb`
   - `flashcards JSONB NOT NULL DEFAULT '[]'::jsonb`
   - `quiz_questions JSONB NOT NULL DEFAULT '[]'::jsonb`
   - `important_terms JSONB NOT NULL DEFAULT '[]'::jsonb`
   - `model_name VARCHAR(255) DEFAULT 'gemini-1.5-flash'`
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

4. **`document_chunks`** (RAG Knowledge Base):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE`
   - `chunk_index INTEGER NOT NULL`
   - `content TEXT NOT NULL`
   - `page_number INTEGER`
   - `embedding REAL[]` (768-dimensional float array for `text-embedding-004`)
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

5. **`document_annotations`** (Persistent user highlights & notes):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE`
   - `page_number INTEGER`
   - `selected_text TEXT`
   - `note_text TEXT NOT NULL DEFAULT ''`
   - `annotation_type VARCHAR(50) NOT NULL DEFAULT 'note'` ('note', 'highlight')
   - `color VARCHAR(50) DEFAULT 'yellow'` ('yellow', 'green', 'blue', 'pink')
   - `context_before TEXT`
   - `context_after TEXT`
   - `position JSONB NOT NULL DEFAULT '{}'::jsonb`
   - `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`

6. **`document_versions`** (Revision tracking and rollback):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE`
   - `version_number INTEGER NOT NULL`
   - `original_filename VARCHAR(255) NOT NULL`
   - `stored_filename VARCHAR(255) NOT NULL`
   - `file_path TEXT NOT NULL`
   - `file_size BIGINT`
   - `file_sha256 VARCHAR(64)`
   - `extracted_text TEXT`
   - `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `UNIQUE (document_id, version_number)`

### Performance Indexes & Functions

- **Full-Text Search Index:** `CREATE INDEX idx_documents_search_vector ON documents USING gin(search_vector);`
- **Duplicate Detection Index:** `CREATE INDEX idx_documents_file_sha256 ON documents(file_sha256);`
- **Cosine Vector Distance Function:**
  ```sql
  CREATE OR REPLACE FUNCTION cosine_similarity(a REAL[], b REAL[])
  RETURNS DOUBLE PRECISION AS $$
  DECLARE
      dot_product DOUBLE PRECISION := 0;
      norm_a DOUBLE PRECISION := 0;
      norm_b DOUBLE PRECISION := 0;
      i INT;
      len INT;
  BEGIN
      len := array_length(a, 1);
      IF len IS NULL OR len <> array_length(b, 1) THEN RETURN 0; END IF;
      FOR i IN 1..len LOOP
          dot_product := dot_product + (a[i] * b[i]);
          norm_a := norm_a + (a[i] * a[i]);
          norm_b := norm_b + (b[i] * b[i]);
      END LOOP;
      IF norm_a = 0 OR norm_b = 0 THEN RETURN 0; END IF;
      RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;
  ```

---

## 4. API Endpoints Reference

All endpoints are hosted on `http://localhost:3000/api`.

| HTTP Method | Route | Description | Parameters / Payload |
|---|---|---|---|
| `GET` | `/health` | Server & DB health check | None |
| `GET` | `/config` | Safe configuration status | None |
| `POST` | `/documents/upload` | Upload PDF with SHA-256 detection | `file` (multipart), `force` (bool) |
| `POST` | `/documents/check-duplicate` | Check file hash before upload | `{ sha256: string }` |
| `GET` | `/documents` | List all library documents | None |
| `GET` | `/documents/:id` | Fetch document by UUID with analysis | URL param `id` |
| `GET` | `/documents/:id/file` | Stream PDF with 206 range support | Range header |
| `POST` | `/documents/:id/analyze` | Generate structured AI intelligence | URL param `id`, `{ force: bool }` |
| `DELETE` | `/documents/:id` | Cascade delete doc, chunks, file | URL param `id` |
| `POST` | `/documents/:id/process-rag` | Generate chunk embeddings in DB | URL param `id` |
| `POST` | `/documents/:id/chat` | Single-document grounded RAG Q&A | `{ question: string }` |
| `POST` | `/documents/chat` | Multi-document cross-library RAG | `{ question: string }` |
| `GET` | `/documents/:id/chunks` | Retrieve chunk records for document | URL param `id` |
| `GET` | `/documents/search/fulltext` | Deterministic PostgreSQL FTS | `?q=query` |
| `POST` | `/documents/compare` | Deterministic Lexical Comparison | `{ documentIds: string[] }` |
| `GET` | `/documents/:id/annotations` | List document notes & highlights | URL param `id`, `?type=`, `?page=` |
| `POST` | `/documents/:id/annotations` | Create highlight or note | `{ note_text, selected_text, page_number, color, ... }` |
| `PUT` | `/documents/:id/annotations/:annotationId` | Update note text or color | URL params, updated fields |
| `DELETE` | `/documents/:id/annotations/:annotationId` | Delete note or highlight | URL params |
| `GET` | `/documents/annotations/revision` | Fetch all flash revision items | Optional `?documentId=` |
| `GET` | `/documents/:id/versions` | List version history for document | URL param `id` |
| `GET` | `/documents/:id/versions/:versionNumber/file` | Stream historical version PDF | Range header |
| `POST` | `/documents/:id/versions` | Upload a new revision | `file` (multipart) |
| `POST` | `/documents/:id/versions/:versionNumber/restore` | Rollback to historical version | URL params |

---

## 5. Algorithmic Implementations

### 5.1 Duplicate Analysis Protection & Idempotence
To eliminate wasteful API calls and prevent duplicate billing:
1. When `/api/documents/:id/analyze` is invoked, the controller queries `document_analyses` for `document_id`.
2. If an analysis record exists and `force !== true`, the controller returns the cached analysis immediately with `cached: true`.
3. The Gemini API is **never** invoked if the analysis already exists in PostgreSQL.

### 5.2 Deterministic Lexical Comparison Engine
Unlike superficial LLM comparisons, the comparison controller (`comparisonController.js`) executes mathematical algorithms:
- **Jaccard Vocabulary Similarity ($J(A, B)$):**
  $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
  Calculated over distinct sets of non-stop-word vocabulary tokens.
- **Cosine Term-Frequency Similarity ($\cos(\vec{u}, \vec{v})$):**
  $$\cos(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
  Measures thematic alignment across normalized word frequency vectors.
- **Passage-Level Diff Alignment:**
  Passages from Document A and Document B are segmented into sentence units. Each passage in Document A is evaluated against passages in Document B using token Jaccard matching. Passages with $\ge 65\%$ token overlap are aligned as `match` (green). Unmatched passages are classified as `unique_a` (red) or `unique_b` (blue).

### 5.3 Retrieval-Augmented Generation (RAG) Pipeline
1. **Extraction & Chunking:** PDFs are parsed using `pdf-parse`. Text is segmented into 800-character overlapping chunks (150-character stride) preserving page numbers.
2. **Embeddings:** Each chunk is passed to Google `text-embedding-004` to produce a 768-dimensional float array.
3. **Storage:** Vectors are stored directly into PostgreSQL in the `embedding` column of `document_chunks`.
4. **Retrieval:** User queries are embedded with the same model. PostgreSQL calculates the cosine similarity against all chunks using `cosine_similarity(chunk.embedding, query_embedding)`.
5. **Grounded Generation:** The top $k$ chunks ($\text{similarity} \ge 0.50$) are supplied to Gemini 1.5 with a strict grounding prompt: *"Answer strictly using the provided excerpts. Cite every statement with [Source X]. If the excerpts do not contain the answer, explicitly state that."*

---

## 6. Verification & Test Results

A full regression suite (`backend/test_regression.js`) was executed against the live database and services:

| Test ID | Description | Verified Result | Status |
|---|---|---|---|
| **TEST 1** | Database Health & Table Connectivity | PostgreSQL connected, `geminiConfigured: true` | **PASSED** |
| **TEST 2** | Document Listing | 2 documents retrieved (`UNIT5.pdf`, `IOT Notes.pdf`) | **PASSED** |
| **TEST 3** | Detail & Duplicate Analysis Protection | `cached: true`, zero redundant Gemini calls | **PASSED** |
| **TEST 4** | Single-Document Grounded RAG Chat | Grounded answer with 4 citations from `UNIT5.pdf` | **PASSED** |
| **TEST 5** | Multi-Document Cross-Workspace Chat | Grounded answer with 6 citations across both documents | **PASSED** |
| **TEST 6** | PostgreSQL Full-Text Search | Native tsvector match, Rank 25.5 on `IOT Notes.pdf` | **PASSED** |
| **TEST 7** | Deterministic Lexical Comparison | Composite 17%, 287 shared concepts, passage diffs | **PASSED** |
| **TEST 8** | Persistent Annotations & Notes CRUD | Created, retrieved, and deleted note record in PostgreSQL | **PASSED** |
| **TEST 9** | Non-Existent Document Error Handling | Returned 404 with standard error JSON response | **PASSED** |

### Frontend Build Verification
`vite build` executed with zero errors, compiling 1,880 modules into production-ready assets (`dist/assets/index.js`, `dist/assets/index.css`, `dist/assets/pdf.worker.min.js`).

---

## 7. Setup & Execution Guide

### Prerequisites
- Node.js 18+ (tested on Node v22.14.0)
- PostgreSQL 14+ installed and running on port 5432
- Google Gemini API Key

### Step-by-Step Installation

1. **Clone & Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your PostgreSQL credentials and Gemini API key:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=ai_knowledge_workspace
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-1.5-flash
   ```

2. **Initialize PostgreSQL Database:**
   ```bash
   psql -U postgres -c "CREATE DATABASE ai_knowledge_workspace;"
   psql -U postgres -d ai_knowledge_workspace -f backend/schema.sql
   ```

3. **Install Dependencies:**
   ```bash
   # AI Service
   cd ai-service && npm install
   # Backend
   cd ../backend && npm install
   # Frontend
   cd ../frontend && npm install
   ```

4. **Run Development Servers:**
   - **Backend:** `cd backend && npm run dev` (Runs on `http://localhost:3000`)
   - **Frontend:** `cd frontend && npm run dev` (Runs on `http://localhost:5173`)

---

## 8. Viva Voce & Academic Defense Questions

### Q1: Why use PostgreSQL for vector storage instead of Pinecone or Milvus?
**Answer:** PostgreSQL provides full transactional ACID guarantees, relational joins between documents, chunks, annotations, and analyses in a single database engine, and zero external network latency. Native `REAL[]` storage with a plpgsql dot-product function makes the architecture 100% self-hosted, offline-capable, and cost-effective.

### Q2: What is the difference between Lexical Comparison and Semantic Similarity?
**Answer:** Lexical comparison (Jaccard and Cosine TF) evaluates exact word token frequency and set intersections. It identifies literal phrase duplication and shared vocabulary. Semantic similarity evaluates conceptual meaning via high-dimensional vector embeddings, allowing models to recognize shared ideas even when expressed using entirely different phrasing. ResearchSpace uses deterministic lexical diffing for side-by-side comparison to guarantee reproducible, verifiable metrics without LLM hallucinations.

### Q3: How does the system prevent LLM hallucinations during document chat?
**Answer:** The system uses strict Grounded Retrieval-Augmented Generation (RAG). The user's query is matched against pre-embedded document chunks in PostgreSQL using cosine distance. Only verified passages exceeding the similarity threshold are injected into the prompt. The Gemini model is instructed with a system constraint to answer *strictly* using the excerpts and cite the specific `[Source X]` page and chunk.

### Q4: Why is SHA-256 computed on upload?
**Answer:** SHA-256 cryptographic hashing creates a 64-character fingerprint of the raw file content. This enables sub-millisecond duplicate detection before saving redundant binary files to disk, saving server storage and avoiding re-running redundant text extraction or embedding generation.

### Q5: How does the in-browser PDF reader handle text selection and highlighting?
**Answer:** The PDF is rendered onto an HTML5 `<canvas>` element via PDF.js. An invisible, transparent `<div class="pdf-text-layer">` is positioned directly over the canvas with identical font sizing and coordinates. When a user highlights text, native DOM selection API captures the text range, computes context before/after snippets, and records the bounding coordinates to PostgreSQL.

---

## 9. Limitations & Future Work

1. **Scanned PDF OCR:** PDFs with rasterized images require external Tesseract OCR for text extraction.
2. **Multi-User Role-Based Access Control (RBAC):** Schema includes `users` and `workspaces` tables, ready for multi-tenant JWT authentication.
3. **Hierarchical Knowledge Graph:** Future iterations could extract entities and relationships into a Neo4j knowledge graph.

---
*Report compiled and verified for AI Research and Knowledge Workspace (ResearchSpace).*
