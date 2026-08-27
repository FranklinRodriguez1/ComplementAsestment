-- pgvector: stores and searches the message embeddings used by the RAG copilot.
-- gen_random_uuid() has been built into core PostgreSQL since v13 (no pgcrypto needed).
CREATE EXTENSION IF NOT EXISTS vector;
