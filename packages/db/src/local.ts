/** Local walkthrough adapter. Production Postgres remains in schema.ts.
 * Only the authorization service may use this connection for learner reads.
 */
import { RUNTIME_MIGRATIONS, MIGRATION_LEDGER, migrationChecksum } from './runtime-migrations';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export function openLocalDatabase(filename?: string): DatabaseSync {
  if (!filename && process.env.APP_ORIGIN && !isAbsolute(process.env.LOCAL_DATA_DIR || ''))
    throw new Error('Public hosting requires LOCAL_DATA_DIR on an absolute persistent volume');
  // Runtime data is not a build input and must never be traced into deployment output.
  const directory = resolve(
    /* turbopackIgnore: true */ process.env.LOCAL_DATA_DIR || '.local-data',
  );
  if (!filename) mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(filename ?? resolve(directory, 'basabridge.sqlite'));
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(MIGRATION_LEDGER);
    const applied = db.prepare('SELECT version, checksum FROM local_runtime_migrations').all();
    if (applied.some((row) => Number(row.version) > RUNTIME_MIGRATIONS.at(-1)!.version))
      throw new Error('migration_version');
    for (const migration of RUNTIME_MIGRATIONS) {
      const previous = applied.find((row) => Number(row.version) === migration.version);
      const checksum = migrationChecksum(migration.sql);
      if (previous && previous.checksum !== checksum) throw new Error('migration_checksum');
      if (!previous) {
        db.exec(migration.sql);
        db.prepare(
          'INSERT INTO local_runtime_migrations (version,name,checksum,applied_at) VALUES (?,?,?,?)',
        ).run(migration.version, migration.name, checksum, new Date().toISOString());
      }
    }
    db.exec('PRAGMA user_version = 4; COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }
  return db;
}
