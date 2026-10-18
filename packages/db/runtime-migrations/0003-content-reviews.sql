-- Runtime schema v3. Executed idempotently by runtime.ts and local.ts.
-- Separate from the normalized research Drizzle migrations.
-- Preserve approval audit history; no destructive down migration.
CREATE TABLE IF NOT EXISTS local_content_reviews (
  content_id TEXT PRIMARY KEY, content_hash TEXT NOT NULL, status TEXT NOT NULL,
  reviewer TEXT NOT NULL, reviewed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS local_review_audit (
  id TEXT PRIMARY KEY, content_id TEXT NOT NULL, content_hash TEXT NOT NULL,
  status TEXT NOT NULL, reviewer TEXT NOT NULL, reviewed_at TEXT NOT NULL
);
