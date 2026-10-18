import { createHash } from 'node:crypto';
export const RUNTIME_MIGRATIONS = [
  {
    version: 3,
    name: 'runtime baseline and content review',
    sql: "\nCREATE TABLE IF NOT EXISTS local_users (\n  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,\n  role TEXT NOT NULL CHECK (role IN ('student','parent')), age_band TEXT NOT NULL,\n  created_at TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0\n);\nCREATE TABLE IF NOT EXISTS local_auth_sessions (\n  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,\n  expires_at BIGINT NOT NULL\n);\nCREATE TABLE IF NOT EXISTS local_link_codes (\n  code_hash TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,\n  expires_at BIGINT NOT NULL\n);\nCREATE TABLE IF NOT EXISTS local_parent_links (\n  parent_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,\n  learner_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,\n  progress INTEGER NOT NULL DEFAULT 0, analysis INTEGER NOT NULL DEFAULT 0,\n  PRIMARY KEY(parent_id, learner_id)\n);\nCREATE TABLE IF NOT EXISTS local_rate_limits (\n  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at BIGINT NOT NULL\n);\nCREATE TABLE IF NOT EXISTS local_recovery_codes (\n  user_id TEXT PRIMARY KEY REFERENCES local_users(id) ON DELETE CASCADE,\n  code_hash TEXT NOT NULL, created_at BIGINT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS local_sessions_user ON local_auth_sessions(user_id);\nCREATE INDEX IF NOT EXISTS local_sessions_expiry ON local_auth_sessions(expires_at);\nCREATE INDEX IF NOT EXISTS local_limits_expiry ON local_rate_limits(expires_at);\nCREATE INDEX IF NOT EXISTS local_links_learner ON local_parent_links(learner_id);\nCREATE TABLE IF NOT EXISTS local_content_reviews (\n  content_id TEXT PRIMARY KEY, content_hash TEXT NOT NULL, status TEXT NOT NULL,\n  reviewer TEXT NOT NULL, reviewed_at TEXT NOT NULL\n);\nCREATE TABLE IF NOT EXISTS local_review_audit (\n  id TEXT PRIMARY KEY, content_id TEXT NOT NULL, content_hash TEXT NOT NULL,\n  status TEXT NOT NULL, reviewer TEXT NOT NULL, reviewed_at TEXT NOT NULL\n);\n",
  },
  {
    version: 4,
    name: 'activity staff jobs and operations',
    sql: `
CREATE TABLE IF NOT EXISTS local_reading_sessions (id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE, data TEXT NOT NULL, started_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS local_reading_by_learner ON local_reading_sessions(learner_id, started_at);
CREATE TABLE IF NOT EXISTS local_reading_answers (session_id TEXT NOT NULL REFERENCES local_reading_sessions(id) ON DELETE CASCADE, question_index INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(session_id, question_index));
CREATE TABLE IF NOT EXISTS local_lesson_work (learner_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE, lesson_id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(learner_id, lesson_id));
CREATE TABLE IF NOT EXISTS local_placement_work (learner_id TEXT PRIMARY KEY REFERENCES local_users(id) ON DELETE CASCADE, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS local_staff (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','content','guardian')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS local_staff_invites (token_hash TEXT PRIMARY KEY, role TEXT NOT NULL, expires_at BIGINT NOT NULL, created_by TEXT NOT NULL REFERENCES local_staff(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS local_staff_sessions (token_hash TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES local_staff(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS local_staff_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS local_generation_jobs (id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE, status TEXT NOT NULL, created_at BIGINT NOT NULL, lease_until BIGINT NOT NULL, payload TEXT NOT NULL, result TEXT, error_code TEXT, session_id TEXT);
CREATE TABLE IF NOT EXISTS local_generation_slots (learner_id TEXT PRIMARY KEY REFERENCES local_users(id) ON DELETE CASCADE, job_id TEXT NOT NULL REFERENCES local_generation_jobs(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS local_generation_expiry ON local_generation_jobs(status, lease_until);
CREATE TABLE IF NOT EXISTS local_operational_metrics (day TEXT NOT NULL, operation TEXT NOT NULL, outcome TEXT NOT NULL, count BIGINT NOT NULL, duration_ms BIGINT NOT NULL, PRIMARY KEY(day,operation,outcome));
`,
  },
] as const;
export const MIGRATION_LEDGER =
  'CREATE TABLE IF NOT EXISTS local_runtime_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)';
export const migrationChecksum = (sql: string) => createHash('sha256').update(sql).digest('hex');
export const RUNTIME_SCHEMA =
  MIGRATION_LEDGER +
  ';' +
  RUNTIME_MIGRATIONS.map(
    (m) =>
      m.sql +
      ';INSERT INTO local_runtime_migrations (version,name,checksum,applied_at) VALUES (' +
      m.version +
      ",'" +
      m.name +
      "','" +
      migrationChecksum(m.sql) +
      "',CAST(CURRENT_TIMESTAMP AS TEXT)) ON CONFLICT(version) DO NOTHING;",
  ).join('\n');
