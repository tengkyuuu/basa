import { afterEach, describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { openLocalDatabase } from './local';
import { RUNTIME_MIGRATIONS } from './runtime-migrations';
let directory: string | undefined;
afterEach(() => {
  if (directory) {
    const target = resolve(directory);
    if (!target.startsWith(resolve(tmpdir()) + sep) || !target.includes('basabridge-migration-'))
      throw new Error('unsafe_test_cleanup');
    rmSync(target, { recursive: true, force: true });
    directory = undefined;
  }
});
describe('runtime migration ledger', () => {
  it('upgrades legacy runtime tables without replacing accounts and is repeatable', () => {
    directory = mkdtempSync(join(tmpdir(), 'basabridge-migration-'));
    const file = join(directory, 'test.sqlite');
    const old = new DatabaseSync(file);
    old.exec(RUNTIME_MIGRATIONS[0].sql);
    old
      .prepare(
        'INSERT INTO local_users (id,username,password_hash,role,age_band,created_at,state) VALUES (?,?,?,?,?,?,?)',
      )
      .run('legacy', 'legacy', 'not-a-real-password', 'student', '13plus', '2026-10-18', '{}');
    old.close();
    const upgraded = openLocalDatabase(file);
    expect(upgraded.prepare('SELECT username FROM local_users').get()?.username).toBe('legacy');
    expect(
      upgraded
        .prepare('SELECT version FROM local_runtime_migrations ORDER BY version')
        .all()
        .map((row) => row.version),
    ).toEqual([3, 4]);
    upgraded.close();
    const again = openLocalDatabase(file);
    expect(again.prepare('SELECT COUNT(*) AS n FROM local_users').get()?.n).toBe(1);
    again
      .prepare("UPDATE local_runtime_migrations SET checksum = 'changed' WHERE version = 4")
      .run();
    again.close();
    expect(() => openLocalDatabase(file)).toThrow('migration_checksum');
  });
});
