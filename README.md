# AI Research and Knowledge Workspace

> **Project Title:** Design and Development of an AI-Powered Document Intelligence and Knowledge Management System Using Retrieval-Augmented Generation

An enterprise-ready AI document intelligence and knowledge management workspace built for researchers, analysts, and students. The platform enables users to upload PDF documents, extract text with authentic page mapping, generate structured AI intelligence (summaries, key takeaways, interactive flashcards, quizzes, and domain terminology) using Google Gemini, and chat with documents via **Retrieval-Augmented Generation (RAG)** grounded strictly in the source material with verifiable citations.

---

## Key Highlights

- **Zero Fake / Mock Data:** All documents, analyses, summaries, quizzes, embeddings, and chat answers are genuine, persisted in PostgreSQL, and derived from actual uploaded PDFs.
- **PostgreSQL UUID Architecture:** Uses native PostgreSQL UUID primary keys (`gen_random_uuid()`) across all tables.
- **Strict Duplicate-Analysis Protection:** Documents are analyzed by Gemini only once. Re-analyzing returns the stored analysis directly from PostgreSQL without repeating Gemini API calls.
- **True Page-Level Grounding:** Extracts text page-by-page using PDF parse hooks so every retrieved chunk and citation identifies the authentic page number without fabrication.
- **PostgreSQL Vector Semantic Retrieval:** Stores 768-dimensional embeddings generated via Google `text-embedding-004` in PostgreSQL `document_chunks`, running high-speed cosine similarity searches natively. Also supports the `pgvector` extension if enabled.
- **Strictly Grounded RAG Chat:** Gemini is constrained to answer exclusively using retrieved passages. If an answer cannot be found in the document, it explicitly states so rather than hallucinating.
- **Multi-Document Workspace Chat:** Allows cross-document queries across the entire workspace library with per-document citations.
- **Server-Side Security:** API keys and database credentials remain strictly on the backend and are never exposed to the frontend.

---

## Technology Stack

| Layer | Technologies | Port |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS Design System, Lucide Icons | `5173` |
| **Backend** | Node.js, Express.js, Multer, `pg` (node-postgres), `dotenv` | `3000` |
| **Database & Vector Store** | PostgreSQL 15 (`ai_knowledge_workspace`), native vector cosine functions, optional `pgvector` | `5432` |
| **AI Layer** | Google Gemini API (`@google/generative-ai`), `text-embedding-004`, `gemini-2.5-flash`, `pdf-parse` | Server-Side |

---

## System Architecture & RAG Pipeline

```text
                                   [ User Client (React + Vite) ]
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
             Upload PDF Document                              Ask Grounded Question
                     │                                                 │
                     ▼                                                 ▼
            [ Express API ]                                     [ Express API ]
                     │                                                 │
          ┌──────────┴──────────┐                             ┌────────┴────────┐
          ▼                     ▼                             ▼                 ▼
   Save Local PDF        Extract Pages & Text          Query Embedding    Retrieve Top-K Chunks
   (uploads/)           (pdf-parse hooks)             (text-embedding-004)  (PostgreSQL Cosine Sim)
                                │                                               │
                                ▼                                               ▼
                         Semantic Chunking                             Pass Chunks to Gemini
                         (Paragraphs/Sentences)                        (gemini-2.5-flash)
                                │                                               │
                                ▼                                               ▼
                         Generate Embeddings                            Grounded Answer +
                        (text-embedding-004)                          Verifiable Citations
                                │                                               │
                                ▼                                               ▼
                      [ PostgreSQL Database ] ◄────────────────────── [ Display in UI ]
                         - documents                                    - Answer text
                         - document_analyses                            - Page & chunk badges
                         - document_chunks (embeddings)                 - Source inspector
```

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
└── analyzed_at (TIMESTAMPTZ)   <-- Note: No updated_at column

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

Table: document_chunks
├── id (UUID, PK, gen_random_uuid())
├── document_id (UUID, FK -> documents.id ON DELETE CASCADE)
├── chunk_index (INTEGER)
├── content (TEXT)
├── page_number (INTEGER)
├── embedding (REAL[], 768 dimensions)
└── created_at (TIMESTAMPTZ)
```

### Native PostgreSQL Vector Search vs. pgvector

1. **Native PostgreSQL Cosine Similarity (Default):**  
   The workspace includes an immutable PL/pgSQL `cosine_similarity(REAL[], REAL[])` function that computes dot product and Euclidean norms directly in PostgreSQL. This runs with 100% vector accuracy on standard PostgreSQL installations without requiring third-party DLLs.

2. **Enabling pgvector (Optional Enhancement):**  
   If you wish to use the C-based `pgvector` extension on Windows:
   - Download the precompiled binary for PostgreSQL 15 from [pgvector releases](https://github.com/pgvector/pgvector/releases).
   - Copy `vector.dll` into `C:\Program Files\PostgreSQL\15\lib` and `vector.control` / `vector--*.sql` into `C:\Program Files\PostgreSQL\15\share\extension`.
   - In pgAdmin or psql, run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768) USING embedding::vector(768);
     CREATE INDEX IF NOT EXISTS idx_document_chunks_vec ON document_chunks USING ivfflat (embedding vector_cosine_ops);
     ```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

### 2. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env`:
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
# In the project root:
cd backend && npm install
cd ../ai-service && npm install
cd ../frontend && npm install
```

### 4. Database Initialization
Ensure PostgreSQL service is running and database `ai_knowledge_workspace` exists.  
Apply the schema and migrations:
```bash
# From backend directory:
node -e "require('./src/db').checkDatabaseConnection()"
```
Or execute `backend/schema.sql` directly in **pgAdmin Query Tool**.

---

## Running the Application

Open two terminal windows:

### Terminal 1: Start Backend (Port 3000)
```bash
cd backend
npm run dev
```

### Terminal 2: Start Frontend (Port 5173)
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## REST API Reference

### Health & Workspaces
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend and database liveness status |
| `GET` | `/api/workspaces` | List all workspaces with document counts |
| `POST` | `/api/workspaces/:workspaceId/chat` | Cross-document RAG chat within workspace |

### Document Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Upload PDF file (multipart/form-data) |
| `GET` | `/api/documents` | Retrieve all documents |
| `GET` | `/api/documents/:id` | Get document by UUID (includes analysis) |
| `DELETE` | `/api/documents/:id` | Delete document, analysis, chunks, and physical file |

### AI Analysis & Duplicate Protection
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/:id/analyze` | Check PostgreSQL for cached analysis; if not present, calls Gemini, validates, and persists |

### Retrieval-Augmented Generation (RAG)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/:id/process-rag` | Chunk document and generate vector embeddings |
| `POST` | `/api/documents/:id/chat` | Grounded single-document Q&A with source citations |
| `POST` | `/api/documents/chat` | Grounded multi-document Q&A across the workspace |
| `GET` | `/api/documents/:id/chunks` | Retrieve chunks for inspection (without vector payloads) |
| `GET` | `/api/documents/:id/search?q=...` | Semantic similarity search returning matching chunks |

---

## Verifying Acceptance Criteria

Run the automated acceptance suite to test all 18 core requirements:
```bash
node scratch/test_acceptance.js
```

### Manual Verification Flow
1. **Upload:** Upload a PDF document on `http://localhost:5173`. Document ID is stored as a UUID in PostgreSQL.
2. **Analysis:** Click *Analyse Document*. Gemini extracts summary, flashcards, quiz, key points, and important terms.
3. **Duplicate Protection:** Refresh the page and click *Analyse Document* again. The server immediately returns the cached analysis with `cached: true` without invoking Gemini.
4. **Document Chat (RAG):** Navigate to the *Chat (RAG)* tab. Ask a question regarding the document. Observe the grounded answer with interactive source citation pills (`[Source 1: Page 1, Chunk #0 - 92% match]`). Click a pill to view the source passage.
5. **Multi-Doc Chat:** Click *Multi-Doc Chat* from the home view to search and ask questions across multiple documents at once.
6. **Deletion:** Click the delete button. The document record, analysis, vector chunks, and filesystem PDF file are cleanly removed.
