# AI Research and Knowledge Workspace

> **Project Title:** Design and Development of an AI-Powered Document Intelligence and Knowledge Management System Using Retrieval-Augmented Generation

An AI-powered document intelligence and knowledge management workspace designed for researchers, students, and professionals. The platform allows users to upload PDF documents, extract text, and generate structured intelligence—including executive summaries, synthesized key points, interactive flashcards, comprehension quizzes with instant feedback, and domain terminology—powered by Google Gemini and backed by PostgreSQL.

---

## Milestone 1 Overview

This repository currently implements **Milestone 1 (Partial-Completion Foundation)**:
- **Zero Mock / Fake Data**: All displayed documents and intelligence are real, persisted in PostgreSQL, and derived from actual uploaded PDFs.
- **Strict Duplicate-Analysis Protection**: Documents are analyzed by Gemini only once. Subsequent analysis requests are served immediately from PostgreSQL storage, completely avoiding redundant Gemini API calls.
- **Server-Side Security**: Gemini API keys and PostgreSQL credentials remain strictly on the backend and are never exposed to the client.
- **Professional Productivity UI**: Clean, restrained design with light/navy/blue palette, responsive layouts, and interactive study components.

---

## Technology Stack

| Layer | Technologies | Port |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS Design System, Lucide Icons | `5173` |
| **Backend** | Node.js, Express.js, Multer, `pg` (node-postgres), `dotenv` | `3000` |
| **Database** | PostgreSQL | `5432` |
| **AI Layer** | Google Gemini API (`@google/generative-ai`), `pdf-parse` | Server-Side |

---

## Folder Structure

```text
AI Research and Knowledge Workspace/
├── .env                  # Environment variables (DB credentials, Gemini API key)
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules for node_modules, uploads, .env
├── README.md             # Project documentation
│
├── ai-service/           # PDF text processing & AI analysis service
│   ├── package.json
│   └── src/
│       ├── pdfService.js         # Text extraction using pdf-parse with validation
│       ├── geminiService.js      # Structured prompt and Gemini API integration
│       ├── analysisValidator.js  # Schema validator for Gemini JSON response
│       └── index.js              # Service facade
│
├── backend/              # Express REST API & Database Integration
│   ├── package.json
│   ├── schema.sql        # Database schema reference
│   ├── uploads/          # Local PDF storage directory
│   └── src/
│       ├── index.js              # Express app entry & CORS config
│       ├── db/
│       │   └── index.js          # PostgreSQL connection pool & queries
│       ├── middleware/
│       │   ├── upload.js         # Multer PDF upload configuration & validation
│       │   └── errorHandler.js   # Centralized secure error handling
│       ├── controllers/
│       │   └── documentController.js # Upload, retrieve, analyze (with cache check), delete
│       └── routes/
│           └── documentRoutes.js # Express router for /api/documents
│
└── frontend/             # React Client Application
    ├── package.json
    ├── vite.config.js    # Vite dev server configuration (port 5173)
    ├── index.html        # HTML entry point with Inter typography
    └── src/
        ├── main.jsx      # React root mount
        ├── App.jsx       # Main layout & state management
        ├── index.css     # Clean design tokens & styles
        ├── services/
        │   └── api.js    # Central API client for http://localhost:3000/api
        └── components/
            ├── Sidebar.jsx           # Navigation and document count
            ├── WorkspaceHeader.jsx   # Contextual breadcrumb and actions
            ├── UploadModal.jsx       # Real PDF drag-and-drop & file picker
            ├── DocumentList.jsx      # Document grid
            ├── DocumentCard.jsx      # Metadata, status, view/analyse actions
            ├── DocumentWorkspace.jsx # Document detail view with tab navigation
            ├── EmptyState.jsx        # Displayed when 0 documents exist
            ├── LoadingState.jsx      # Clean spinner indicator
            ├── ErrorAlert.jsx        # User-friendly toast error notification
            └── tabs/
                ├── OverviewTab.jsx       # Summary and core highlights
                ├── KeyPointsTab.jsx      # Synthesized bullet takeaways
                ├── FlashcardsTab.jsx     # Flip/carousel interactive flashcards
                ├── QuizTab.jsx           # Multiple-choice quiz with immediate feedback
                └── ImportantTermsTab.jsx # Glossary of domain terms and definitions
```

---

## Installation & Setup Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (v14 or higher recommended)
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

---

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Open `.env` and fill in your PostgreSQL credentials and Gemini API key:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_knowledge_workspace
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

DATABASE_URL=

GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note:** If `DATABASE_URL` is set, it will take precedence over individual `DB_*` parameters.

---

### 3. Configure PostgreSQL Database
Connect to PostgreSQL and create the database if not already created:

```sql
CREATE DATABASE ai_knowledge_workspace;
```

If you wish to verify or create the expected tables, refer to [`backend/schema.sql`](backend/schema.sql):

```sql
-- Connect to ai_knowledge_workspace database and run:
\i backend/schema.sql
```

The tables include:
- `users`: User profiles (for future authentication).
- `workspaces`: Workspaces containing documents.
- `documents`: Uploaded document metadata, file paths, status, and extracted text.
- `document_analyses`: Unique 1:1 analysis containing summary, key points, flashcards, quizzes, and terms.

---

### 4. Install Dependencies

Install dependencies in all three folders:

```bash
# 1. AI Service
cd ai-service
npm install

# 2. Backend
cd ../backend
npm install

# 3. Frontend
cd ../frontend
npm install
```

---

### 5. Running the Application

#### Terminal 1: Start Backend (Port 3000)
```bash
cd backend
npm start
```
The server will start on `http://localhost:3000`.

#### Terminal 2: Start Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Available API Endpoints

All endpoints are hosted at `http://localhost:3000/api`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint |
| `POST` | `/documents/upload` | Upload a PDF file (multipart/form-data with field `file`) |
| `GET` | `/documents` | Retrieve all documents from PostgreSQL |
| `GET` | `/documents/:id` | Retrieve a single document with its analysis if available |
| `POST` | `/documents/:id/analyze` | Run or retrieve document analysis (enforces duplicate protection) |
| `DELETE` | `/documents/:id` | Delete a document, local PDF file, and associated analysis |

---

## Duplicate-Analysis Protection Logic

To prevent unnecessary Gemini API costs and token usage, the backend enforces duplicate protection:

```
POST /api/documents/:id/analyze
       │
       ▼
Find document in PostgreSQL
       │
       ▼
SELECT * FROM document_analyses WHERE document_id = ?
       │
       ├────────────────────────────────────────┐
       ▼                                        ▼
[Analysis Exists in DB]                  [No Analysis Yet]
       │                                        │
Return existing analysis                         │
DO NOT CALL GEMINI                      Extract/reuse text
       │                                        │
     STOP                               Update status = 'processing'
                                                │
                                        Call Gemini via ai-service
                                                │
                                        Validate structured JSON
                                                │
                                        INSERT INTO document_analyses
                                                │
                                        Update status = 'analyzed'
                                                │
                                        Return fresh analysis
```

---

## Current Features (Milestone 1)

1. **PDF Upload & Storage**: Upload genuine PDF files up to 25 MB with MIME validation and safe local disk storage in `backend/uploads/`.
2. **PostgreSQL Persistence**: Document metadata, extracted text, and structured analysis are saved in PostgreSQL and persist across refreshes.
3. **PDF Text Extraction**: Text extracted directly on the server and cached in `documents.extracted_text`.
4. **Structured Gemini Intelligence**:
   - Executive Summary
   - Key Points / Takeaways
   - Flashcards (Interactive Question/Answer Flip)
   - Comprehension Quiz (Interactive MCQ with immediate feedback and explanation)
   - Important Terms & Definitions Glossary
5. **Duplicate-Analysis Guard**: Double-clicking, refreshing, or re-opening a document never triggers duplicate Gemini calls.
6. **Clean Productivity Workspace**: Responsive UI without AI slop or fake mock data.

---

## Future Roadmap (Milestone 2 & Beyond)

In subsequent milestones, this workspace will expand into a full Retrieval-Augmented Generation (RAG) system:
- **Document Chunking & Vectorization**: Recursive text chunking and dense embeddings.
- **Vector Database**: Integration with ChromaDB / pgvector for semantic retrieval.
- **RAG-Powered Chat**: Chat directly with uploaded documents with grounded source citations and page references.
- **Multi-Document Synthesis**: Cross-document query synthesis and comparative research.
- **User Authentication**: Secure multi-user login and workspace access control.
