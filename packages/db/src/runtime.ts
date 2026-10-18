import postgres from 'postgres';
import type { DatabaseSync } from 'node:sqlite';
import { openLocalDatabase } from './local';

type Value = string | number | null;
type Row = Record<string, unknown>;
export interface RuntimeDatabase {
  prepare(sql: string): {
    get(...values: Value[]): Promise<Row | undefined>;
    all(...values: Value[]): Promise<Row[]>;
    run(...values: Value[]): Promise<{ changes: number }>;
  };
  transaction<T>(work: (tx: RuntimeDatabase) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

import { RUNTIME_MIGRATIONS, MIGRATION_LEDGER, migrationChecksum } from './runtime-migrations';
export { RUNTIME_SCHEMA } from './runtime-migrations';

// Our fixed SQL contains only positional question marks, never SQL operators or literal '?'.
export function postgresParameters(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/** Serialize local operations so async transaction callbacks cannot interleave. */
export function sqliteRuntime(database: DatabaseSync): RuntimeDatabase {
  let tail: Promise<unknown> = Promise.resolve();
  const locked = <T>(work: () => Promise<T>): Promise<T> => {
    const next = tail.then(work);
    tail = next.catch(() => undefined);
    return next;
  };
  function adapter(inTransaction: boolean): RuntimeDatabase {
    const execute = <T>(work: () => T) =>
      inTransaction ? Promise.resolve().then(work) : locked(async () => work());
    return {
      prepare: (sql) => ({
        get: (...values) => execute(() => database.prepare(sql).get(...values)),
        all: (...values) => execute(() => database.prepare(sql).all(...values)),
        run: (...values) =>
          execute(() => ({ changes: Number(database.prepare(sql).run(...values).changes) })),
      }),
      transaction: (work) =>
        locked(async () => {
          database.exec('BEGIN IMMEDIATE');
          try {
            const result = await work(adapter(true));
            database.exec('COMMIT');
            return result;
          } catch (error) {
            database.exec('ROLLBACK');
            throw error;
          }
        }),
      close: () =>
        locked(async () => {
          database.close();
        }),
    };
  }
  return adapter(false);
}

export async function openRuntimeDatabase(): Promise<RuntimeDatabase> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || process.env.VERCEL)
      throw new Error('Public hosting requires DATABASE_URL');
    return sqliteRuntime(openLocalDatabase());
  }
  const sql = postgres(url, {
    max: process.env.VERCEL ? 2 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    connection: { application_name: 'basabridge', statement_timeout: 15000 },
    onnotice: () => {}, // Provider notices must not enter logs.
  });
  try {
    // Serialize first-boot schema installation across instances.
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(281934671)`;
      await tx.unsafe(MIGRATION_LEDGER);
      const applied = await tx`SELECT version, checksum FROM local_runtime_migrations`;
      if (applied.some((row) => Number(row.version) > RUNTIME_MIGRATIONS.at(-1)!.version))
        throw new Error('migration_version');
      for (const migration of RUNTIME_MIGRATIONS) {
        const previous = applied.find((row) => Number(row.version) === migration.version);
        const checksum = migrationChecksum(migration.sql);
        if (previous && previous.checksum !== checksum) throw new Error('migration_checksum');
        if (!previous) {
          await tx.unsafe(migration.sql);
          await tx`INSERT INTO local_runtime_migrations (version,name,checksum,applied_at) VALUES (${migration.version},${migration.name},${checksum},${new Date().toISOString()})`;
        }
      }
    });
  } catch {
    await sql.end();
    throw new Error('Database initialization failed');
  }
  function adapter(client: typeof sql | postgres.TransactionSql): RuntimeDatabase {
    const query = (statement: string, values: Value[]) =>
      client.unsafe(postgresParameters(statement), values);
    return {
      prepare: (statement) => ({
        get: async (...values) => (await query(statement, values))[0],
        all: async (...values) => [...(await query(statement, values))],
        run: async (...values) => ({ changes: (await query(statement, values)).count }),
      }),
      transaction: async (work) => {
        const value = await sql.begin(async (tx) => ({ result: await work(adapter(tx)) }));
        return value.result;
      },
      close: async () => {
        await sql.end();
      },
    };
  }
  return adapter(sql);
}
