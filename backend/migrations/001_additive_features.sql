-- =====================================================================
-- Additive Migration: Performance Indexes & Schema Verification
-- AI Research and Knowledge Workspace
-- =====================================================================

-- 1. Ensure file_sha256 column exists on documents (safe additive)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_sha256 VARCHAR(64);

-- 2. Ensure search_vector tsvector column exists on documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 3. Ensure GIN index for full-text search exists on documents
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING gin(search_vector);

-- 4. Ensure index on file_sha256 exists for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_documents_file_sha256 ON documents(file_sha256);

-- 5. Ensure index on document_annotations for fast document note lookups
CREATE INDEX IF NOT EXISTS idx_document_annotations_doc_created ON document_annotations(document_id, created_at DESC);

-- 6. Ensure index on document_versions exists
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id, version_number DESC);
