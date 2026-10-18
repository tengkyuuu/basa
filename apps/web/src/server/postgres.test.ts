import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  openRuntimeDatabase,
  postgresParameters,
  RUNTIME_SCHEMA,
  type RuntimeDatabase,
} from '@basabridge/db/runtime';
import { ReadingService } from './service';

for (const engine of ['pglite', ...(process.env.RUNTIME_TEST_DATABASE_URL ? ['postgres'] : [])]) {
  describe(`reading service on ${engine}`, () => {
    let database: RuntimeDatabase;
    let service: ReadingService;
    const prefix = `pg_${Date.now()}_`;
    const password = 'postgres-test-password';
    beforeAll(async () => {
      if (engine === 'postgres') {
        vi.stubEnv('DATABASE_URL', process.env.RUNTIME_TEST_DATABASE_URL!);
        database = await openRuntimeDatabase();
      } else {
        const pg = new PGlite();
        await pg.exec(RUNTIME_SCHEMA);
        const adapter = (
          query: typeof pg.query,
          transaction: RuntimeDatabase['transaction'],
        ): RuntimeDatabase => ({
          prepare: (sql) => ({
            get: async (...values) =>
              (await query(postgresParameters(sql), values)).rows[0] as
                Record<string, unknown> | undefined,
            all: async (...values) =>
              (await query(postgresParameters(sql), values)).rows as Record<string, unknown>[],
            run: async (...values) => ({
              changes: (await query(postgresParameters(sql), values)).affectedRows ?? 0,
            }),
          }),
          transaction,
          close: () => pg.close(),
        });
        database = adapter(pg.query.bind(pg), (work) =>
          pg.transaction((tx) =>
            work(
              adapter(tx.query.bind(tx), () => {
                throw new Error('No nested transactions');
              }),
            ),
          ),
        );
      }
      service = new ReadingService(database);
    }, 60_000);
    afterAll(async () => {
      if (database) {
        await database.prepare('DELETE FROM local_users WHERE username LIKE ?').run(`${prefix}%`);
        await database.close();
      }
      vi.unstubAllEnvs();
    });
    it('persists and scores a complete session, authorizes sharing, recovers and deletes accounts', async () => {
      const token = await service.register({
        username: `${prefix}reader`,
        password,
        role: 'student',
        ageBand: '13plus',
      });
      await expect(
        service.register({
          username: `${prefix}reader`,
          password,
          role: 'student',
          ageBand: '13plus',
        }),
      ).rejects.toThrow('username_taken');
      await service.skipPlacement(token);
      await service.start(token, 'walkthrough');
      const id = (await service.snapshot(token)).learner!.session!.id;
      await service.beginQuestions(token, id);
      expect((await service.snapshot(token)).learner!.session!.text).toBeNull();
      const choices = [[0], [1], [2], [3], [0, 1]];
      for (const [index, chosen] of choices.entries()) {
        await service.answer(token, id, index, chosen);
        await service.next(token, id, index);
      }
      const reloaded = new ReadingService(database);
      expect((await reloaded.snapshot(token)).learner!.progress).toMatchObject({
        completed: 1,
        correct: 5,
      });
      const parent = await service.register({
        username: `${prefix}parent`,
        password,
        role: 'parent',
        ageBand: 'adult',
      });
      await service.redeem(parent, await service.newLinkCode(token));
      expect((await service.snapshot(parent)).children![0]!.progress).toBeNull();
      const parentId = (await service.snapshot(parent)).account!.id;
      await service.sharing(token, parentId, true, false, false);
      expect((await service.snapshot(parent)).children![0]!.progress!.correct).toBe(5);
      const code = await service.recoveryCode(token, password);
      const recovered = await service.recover(`${prefix}reader`, code, 'new-password-42');
      expect((await service.snapshot(token)).account).toBeNull();
      await service.delete(recovered, 'new-password-42');
      expect((await service.snapshot(parent)).children).toEqual([]);
      await service.delete(parent, password);
    });
    it('enforces shared quotas with concurrent requests', async () => {
      const outcomes = await Promise.allSettled(
        Array.from({ length: 7 }, () => service.rateLimit(`pg:${prefix}`, 3, 60000)),
      );
      expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    });
  });
}
