# ResearchSpace — AI Research and Knowledge Workspace

> **Project Title:** Design and Development of an AI-Powered Document Intelligence and Knowledge Management System Using Retrieval-Augmented Generation

An enterprise-ready AI document intelligence and research knowledge management workspace built for researchers, analysts, students, and engineers. The platform enables users to upload PDF documents, extract text with authentic page mapping, generate structured AI intelligence using Google Gemini, converse with documents via **Retrieval-Augmented Generation (RAG)** grounded strictly in the source material with verifiable citations, execute **deterministic document comparisons**, record **persistent research annotations**, search documents via **PostgreSQL full-text search**, and maintain a **safe version history with SHA-256 duplicate detection**.

---

## Key Highlights

- **Zero Fake / Mock Data:** All documents, analyses, summaries, quizzes, embeddings, comparison metrics, full-text search results, and chat answers are genuine, persisted in PostgreSQL, and derived from actual uploaded PDFs.
- **PostgreSQL UUID Architecture:** Uses native PostgreSQL UUID primary keys (`gen_random_uuid()`) across all tables.
- **Strict Duplicate-Analysis Protection:** Documents are analyzed by Gemini only once. Re-analyzing returns the stored analysis directly from PostgreSQL without repeating Gemini API calls.
- **True Page-Level Grounding:** Extracts text page-by-page using PDF parse hooks so every retrieved chunk and citation identifies the authentic page number without fabrication.
- **PostgreSQL Vector Semantic Retrieval:** Stores 768-dimensional embeddings generated via Google `text-embedding-004` in PostgreSQL `document_chunks`, running high-speed cosine similarity searches natively.
- **Strictly Grounded RAG Chat:** Gemini is constrained to answer exclusively using retrieved passages. If an answer cannot be found in the document, it explicitly states so rather than hallucinating.
- **Multi-Document Workspace Chat:** Allows cross-document queries across the entire workspace library with per-document citations.
- **NEW: Deterministic Document Comparison:** Compares 2 or more documents using Jaccard vocabulary similarity, Cosine TF similarity, shared/unique concept extraction, and verbatim phrase matching without consuming any AI tokens.
- **NEW: Persistent Notes & Annotations:** Create, edit, and delete research notes attached to documents or specific pages, persisted across reloads in PostgreSQL `document_annotations`.
- **NEW: Native PostgreSQL Full-Text Search:** High-performance search across filenames and extracted text using PostgreSQL `tsvector`, `plainto_tsquery`, `ts_rank_cd`, and `ts_headline` with highlighted keyword snippets.
- **NEW: SHA-256 Duplicate Detection & Version History:** Calculates byte-level SHA-256 hashes on upload to prevent redundant storage and offers a safe version timeline in `document_versions` with non-destructive restore and automatic RAG chunk invalidation.
- **Server-Side Security:** API keys and database credentials remain strictly on the backend and are never exposed to the frontend.

---

## Technology Stack

| Layer | Technologies | Port |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS Design System (Soft lavender & deep navy palette, purple/indigo accents), Lucide Icons, ReactMarkdown, remark-gfm | `5173` |
| **Backend** | Node.js, Express.js, Multer, `pg` (node-postgres), Node.js `crypto`, `dotenv` | `3000` |
| **Database & Vector Store** | PostgreSQL 15 (`ai_knowledge_workspace`), native vector cosine functions, GIN full-text indexes, generated `tsvector` | `5432` |
| **AI Layer** | Google Gemini API (`@google/generative-ai`), `text-embedding-004`, `gemini-2.5-flash`, `pdf-parse` | Server-Side |

---

## Core System Features

### 1. Document Comparison Engine (100% Deterministic)
- **Zero AI Dependency:** Operates fully on Node.js and PostgreSQL without consuming Gemini API quota.
- **Jaccard Vocabulary Similarity:** Measures topical overlap via `|A ∩ B| / |A ∪ B|` across non-stop-word vocabulary sets.
- **Cosine Term Frequency (TF) Similarity:** Calculates the normalized dot product of word frequency vectors `(v1 · v2) / (||v1|| * ||v2||)` to measure thematic concentration.
- **Composite Lexical Metric:** Produces an intuitive 0–100% composite similarity score.
- **Shared vs. Distinctive Vocabulary:** Extracts top shared terms with side-by-side frequencies, alongside unique vocabulary specific to Document A and Document B.
- **Verbatim Overlapping Phrases:** Detects continuous 4-word and 5-word phrases common to both texts.
- **Document Profiles:** Computes word counts, character counts, vocabulary diversity ratios (Type-Token Ratio), and estimated reading times.

### 2. PDF Annotations and Research Notes
- **PostgreSQL Persistence:** All notes and annotations are stored in `document_annotations` and persist across browser refreshes and server restarts.
- **Rich Annotation Metadata:** Supports note text, optional verbatim selected text, page number, category tags (`note`, `highlight`, `question`, `summary`, `todo`), color accents (`purple`, `blue`, `yellow`, `green`), and timestamps.
- **Dual Management Interface:**
  - **In-Document Tab:** Manage notes while studying an active document.
  - **Workspace Repository:** A dedicated workspace view to search, filter by document, and manage all research notes across the library.

### 3. Advanced Full-Text Search
- **Native PostgreSQL Search:** Employs PostgreSQL's generated `tsvector` column and `idx_documents_search_vector` GIN index.
- **Relevance Ranking:** Uses `ts_rank_cd` to order matching documents by term density and proximity.
- **Contextual Highlighted Excerpts:** Uses `ts_headline` with `<mark>` tags to generate formatted snippets surrounding matching keywords.
- **Filename & Extracted Text Matching:** Simultaneously matches against document titles and body text.
- **Zero AI Quota Used:** Fast, deterministic search that does not trigger external API calls.

### 4. SHA-256 Duplicate Detection & Version History
- **Byte-Level Hash Calculation:** Computes a SHA-256 cryptographic hash of every uploaded PDF using actual file bytes.
- **Duplicate Prevention:** Checks the database before saving duplicates. When an identical file is detected, users are alerted with the existing document details and can choose to open the existing document or upload anyway.
- **Safe Version Timeline:** Tracks sequential versions (`v1`, `v2`, `v3...`) in PostgreSQL `document_versions` with original filenames, timestamps, file sizes, and SHA-256 hashes.
- **Non-Destructive Version Restore:** Restoring an earlier version creates a new current revision (e.g. Version N+1) carrying the restored document content, ensuring complete historical audit retention.
- **RAG Consistency Assurance:** Uploading a new version or restoring an earlier version automatically refreshes/invalidates stale `document_chunks` and `document_analyses` to guarantee questions are never answered using obsolete text.

---

## Database Design & Schema

The live database is `ai_knowledge_workspace` running on PostgreSQL. All primary keys are UUIDs.

```text
Table: users
├── id (UUID, PK, gen_random_uuid())
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE)
└── created_at (TIMESTAMPTZ)

Table: workspaces
├── id (UUID, PK, gen_random_uuid())
├── user_id (UUID, FK -> users.id)
├── name (VARCHAR)
└── created_at (TIMESTAMPTZ)

Table: documents
├── id (UUID, PK, gen_random_uuid())
├── workspace_id (UUID, FK -> workspaces.id)
├── original_filename (VARCHAR)
├── stored_filename (VARCHAR)
├── file_path (TEXT)
├── file_size (BIGINT)
├── mime_type (VARCHAR)
├── extracted_text (TEXT)
├── status (VARCHAR: 'uploaded', 'processing', 'analyzed', 'failed')
├── created_at (TIMESTAMPTZ)
├── analyzed_at (TIMESTAMPTZ)
├── file_sha256 (VARCHAR(64))                             <-- SHA-256 file hash
└── search_vector (tsvector, GENERATED ALWAYS STORED)     <-- FTS vector with GIN index

Table: document_analyses
├── id (UUID, PK, gen_random_uuid())
├── document_id (UUID, UNIQUE FK -> documents.id ON DELETE CASCADE)
├── summary (TEXT)
├── key_points (JSONB)
├── flashcards (JSONB)
├── quiz_questions (JSONB)
├── important_terms (JSONB)
├── model_name (VARCHAR)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Table: document_chunks (RAG Knowledge Base)
├── id (UUID, PK, gen_random_uuid())
├── document_id (UUID, FK -> documents.id ON DELETE CASCADE)
├── chunk_index (INTEGER)
├── content (TEXT)
├── page_number (INTEGER)
├── embedding (REAL[], 768 dimensions)
└── created_at (TIMESTAMPTZ)

Table: document_annotations (Persistent Notes)
├── id (UUID, PK, gen_random_uuid())
├── document_id (UUID, FK -> documents.id ON DELETE CASCADE)
├── page_number (INTEGER)
├── selected_text (TEXT)
├── note_text (TEXT)
├── annotation_type (VARCHAR, 'note', 'highlight', 'question', 'summary', 'todo')
├── color (VARCHAR, 'purple', 'blue', 'yellow', 'green')
├── position (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Table: document_versions (Version History)
├── id (UUID, PK, gen_random_uuid())
├── document_id (UUID, FK -> documents.id ON DELETE CASCADE)
├── version_number (INTEGER)
├── original_filename (VARCHAR)
├── stored_filename (VARCHAR)
├── file_path (TEXT)
├── file_size (BIGINT)
├── file_sha256 (VARCHAR(64))
├── extracted_text (TEXT)
├── created_at (TIMESTAMPTZ)
└── UNIQUE (document_id, version_number)
```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

### 2. Configure Environment Variables
Ensure `.env` in root and `backend/.env` have your database and API credentials:
```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_knowledge_workspace
DB_USER=postgres
DB_PASSWORD=your_postgres_password

GEMINI_API_KEY=your_actual_gemini_api_key
```

### 3. Install Dependencies
```bash
# In backend:
cd backend && npm install

# In ai-service:
cd ../ai-service && npm install

# In frontend:
cd ../frontend && npm install
```

### 4. Database Migrations
Run the safe, additive migration and backfill runner:
```bash
node backend/migrations/migrate.js
```
This ensures indexes on `document_annotations`, `document_versions`, `file_sha256`, and GIN search vectors are active.

---

## Running the Application

### Start Backend (Port 3000)
```bash
cd backend
npm run dev
```

### Start Frontend (Port 5173)
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## REST API Reference

### Document Management & Upload
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Upload PDF file with SHA-256 duplicate detection & version 1 initialization |
| `POST` | `/api/documents/check-duplicate` | Check if a file or SHA-256 hash already exists in PostgreSQL |
| `GET` | `/api/documents` | Retrieve all documents with metadata & analysis status |
| `GET` | `/api/documents/:id` | Get single document by UUID (includes analysis) |
| `DELETE` | `/api/documents/:id` | Delete document, analysis, chunks, annotations, and physical file |

### Full-Text Search & Document Comparison (Zero AI Quota)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents/search/fulltext?q=...` | PostgreSQL full-text search with `ts_headline` highlighted snippets |
| `POST` | `/api/documents/compare` | Deterministic comparison of 2+ documents (Jaccard, Cosine, shared/unique terms) |

### Notes & Annotations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents/:id/annotations` | List all persistent annotations for a document |
| `POST` | `/api/documents/:id/annotations` | Create a new note/annotation associated with document UUID |
| `PUT` | `/api/documents/:id/annotations/:annId` | Update an existing note (text, quote, page, category, color) |
| `DELETE` | `/api/documents/:id/annotations/:annId` | Delete an annotation from PostgreSQL |

### Version Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents/:id/versions` | List all historical versions for a document |
| `POST` | `/api/documents/:id/versions` | Upload a new revision (clears stale chunks & analysis) |
| `POST` | `/api/documents/:id/versions/:v/restore` | Safely restore version `v` as the new current revision |

### AI Analysis & Retrieval-Augmented Generation (RAG)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/:id/analyze` | Returns cached analysis or generates structured intelligence via Gemini |
| `POST` | `/api/documents/:id/process-rag` | Splits document into chunks and computes 768-dim embeddings |
| `POST` | `/api/documents/:id/chat` | Grounded single-document Q&A with verifiable source citations |
| `POST` | `/api/documents/chat` | Grounded multi-document Q&A across the entire workspace library |
| `GET` | `/api/documents/:id/chunks` | Retrieve chunks for inspection (without vector payloads) |
| `GET` | `/api/documents/:id/search?q=...` | Semantic similarity search returning matching chunks |

---

## Automated Verification Suite

Run the comprehensive regression and verification test suite:
```bash
node backend/test_regression.js
```
This script automatically executes and validates:
1. PostgreSQL health & table connectivity
2. Document listing from database
3. Document analysis retrieval & duplicate analysis protection
4. Single-document RAG Q&A with citations
5. Multi-document workspace Q&A
6. Deterministic PostgreSQL full-text search
7. Deterministic document comparison (Jaccard, Cosine, shared terms)
8. Persistent notes CRUD operations in PostgreSQL
9. Error handling for non-existent documents and corrupt requests
