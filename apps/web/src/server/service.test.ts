import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sqliteRuntime } from '@basabridge/db/runtime';
import { openLocalDatabase } from '@basabridge/db/local';
import { ReadingService } from './service';
import type { DatabaseSync } from 'node:sqlite';
let db: DatabaseSync;
let app: ReadingService;
const password = 'test-password-42';
beforeEach(() => {
  db = openLocalDatabase(':memory:');
  app = new ReadingService(sqliteRuntime(db));
});
afterEach(() => db.close());
const register = async (username: string, role: 'student' | 'parent' = 'student') =>
  await app.register({
    username,
    password,
    role,
    ageBand: role === 'student' ? 'under13' : 'adult',
  });
async function reading(token: string) {
  await app.skipPlacement(token);
  await app.start(token, 'walkthrough');
  return (await app.snapshot(token)).learner!.session!;
}
describe('authorized local reading loop', () => {
  it('a concurrent login using the old password cannot survive password recovery', async () => {
    const token = await register('race');
    const code = await app.recoveryCode(token, password);
    const [login, recovery] = await Promise.allSettled([
      app.login('race', password),
      app.recover('race', code, 'replacement-password-42'),
    ]);
    expect(recovery.status).toBe('fulfilled');
    if (login.status === 'fulfilled') expect((await app.snapshot(login.value)).account).toBeNull();
  });
  it('rotates recovery codes, resets passwords once and invalidates existing sessions', async () => {
    const token = await register('recover');
    const oldCode = await app.recoveryCode(token, password);
    const code = await app.recoveryCode(token, password);
    expect(JSON.stringify(db.prepare('SELECT * FROM local_recovery_codes').all())).not.toContain(
      code,
    );
    await expect(app.recover('recover', oldCode, 'new-password-42')).rejects.toThrow(
      'recovery_invalid',
    );
    const replacement = await app.recover('recover', code, 'new-password-42');
    expect((await app.snapshot(token)).account).toBeNull();
    expect((await app.snapshot(replacement)).account?.username).toBe('recover');
    await expect(app.recover('recover', code, 'another-password')).rejects.toThrow(
      'recovery_invalid',
    );
    await expect(app.login('recover', password)).rejects.toThrow('credentials');
    expect(await app.login('recover', 'new-password-42')).toBeTruthy();
  });
  it('limits simultaneous answers and consumes a linking code only once under contention', async () => {
    const token = await register('concurrent');
    const session = await reading(token);
    await app.beginQuestions(token, session.id);
    const answers = await Promise.allSettled([
      app.answer(token, session.id, 0, [0]),
      app.answer(token, session.id, 0, [1]),
    ]);
    expect(answers.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    const parents = await Promise.all([
      register('parent_one', 'parent'),
      register('parent_two', 'parent'),
    ]);
    const code = await app.newLinkCode(token);
    const links = await Promise.allSettled(parents.map((parent) => app.redeem(parent, code)));
    expect(links.filter((l) => l.status === 'fulfilled')).toHaveLength(1);
  });
  it('enforces a shared quota atomically', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => app.rateLimit('quota', 3, 60000)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
  });
  it('starts empty, hashes passwords, supports login and invalidates sign-out', async () => {
    const token = await register('student');
    expect((await app.snapshot(token)).learner!.progress.completed).toBe(0);
    expect(JSON.stringify(db.prepare('SELECT password_hash FROM local_users').get())).not.toContain(
      password,
    );
    await expect(app.login('student', 'incorrect-password')).rejects.toMatchObject({
      code: 'credentials',
    });
    const second = await app.login('student', password);
    expect((await app.snapshot(second)).account?.username).toBe('student');
    await app.logout(token);
    expect((await app.snapshot(token)).account).toBeNull();
  });
  it('requires placement choice and prevents cross-account session access', async () => {
    const one = await register('one');
    const two = await register('two');
    await expect(app.start(one, 'walkthrough')).rejects.toMatchObject({
      code: 'placement_required',
    });
    const session = await reading(one);
    await expect(app.beginQuestions(two, session.id)).rejects.toThrow('not_found');
    await expect(app.beginQuestions(undefined, session.id)).rejects.toThrow('signed_out');
  });
  it('hides the story and answer key, scores on the server and counts duplicate submissions once', async () => {
    const token = await register('reader');
    const s = await reading(token);
    expect(JSON.stringify(s)).not.toContain('answerIndexes');
    await app.beginQuestions(token, s.id);
    expect((await app.snapshot(token)).learner!.session!.text).toBeNull();
    expect(JSON.stringify(await app.snapshot(token))).not.toContain('The school yard was hot.');
    expect(JSON.stringify(await app.export(token))).not.toContain('answerIndexes');
    expect(JSON.stringify(await app.export(token))).not.toContain('The school yard was hot.');
    await expect(app.answer(token, s.id, 0, [0, 0])).rejects.toThrow('choose_answer');
    for (const [index, chosen] of [
      [0, [0]],
      [1, [1]],
      [2, [2]],
      [3, [3]],
      [4, [0, 1]],
    ] as [number, number[]][]) {
      await app.answer(token, s.id, index, chosen);
      await app.answer(token, s.id, index, [3]);
      await app.next(token, s.id, index);
      await app.next(token, s.id, index);
    }
    const result = (await app.snapshot(token)).learner!;
    expect(result.progress).toMatchObject({ completed: 1, answered: 5, correct: 5 });
    expect(result.session!.result!.correct).toBe(5);
    expect(result.level).toBe(s.level); // Silent reading never fabricates decoding evidence.
    const exported = (await app.export(token)).data as {
      sessions: {
        answers: {
          rushed: boolean;
          weight: number;
        }[];
      }[];
    };
    expect(exported.sessions[0]!.answers[0]).toMatchObject({ rushed: true, weight: 0.3 });
    await app.start(token, 'walkthrough');
    expect((await app.snapshot(token)).learner!.session!.title).not.toBe(s.title);
  });
  it('resumes an active story without creating another one', async () => {
    const token = await register('resume');
    const first = await reading(token);
    await app.start(token, 'walkthrough');
    expect((await app.snapshot(token)).learner!.session!.id).toBe(first.id);
    const nextInstance = new ReadingService(sqliteRuntime(db));
    expect((await nextInstance.snapshot(token)).learner!.session!.id).toBe(first.id);
  });
  it('keeps parent scopes off by default, consumes codes once, and revokes immediately', async () => {
    const student = await register('child');
    const parent = await register('guardian', 'parent');
    const code = await app.newLinkCode(student);
    await app.redeem(parent, code);
    await expect(app.redeem(parent, code)).rejects.toThrow('invalid_code');
    expect((await app.snapshot(parent)).children![0]).toMatchObject({
      progress: null,
      analysis: null,
      level: null,
    });
    const parentId = (await app.snapshot(parent)).account!.id;
    await app.sharing(student, parentId, true, false, false);
    expect((await app.snapshot(parent)).children![0]!.progress?.completed).toBe(0);
    expect((await app.snapshot(parent)).children![0]!.analysis).toBeNull();
    await app.sharing(student, parentId, false, true, false);
    expect((await app.snapshot(parent)).children![0]!.progress).toBeNull();
    expect((await app.snapshot(parent)).children![0]!.analysis).toEqual([]);
    await app.sharing(student, parentId, false, false, true);
    expect((await app.snapshot(parent)).children).toEqual([]);
    await expect(app.start(parent, 'walkthrough')).rejects.toThrow('forbidden');
  });
  it('expires link codes and deletes accounts with auth sessions and links', async () => {
    const token = await register('delete');
    const parent = await register('parent', 'parent');
    const expired = await app.newLinkCode(token);
    db.prepare('UPDATE local_link_codes SET expires_at = 0').run();
    await expect(app.redeem(parent, expired)).rejects.toThrow('invalid_code');
    await app.redeem(parent, await app.newLinkCode(token));
    await expect(app.delete(token, 'wrong')).rejects.toThrow('credentials');
    await app.delete(token, password);
    expect((await app.snapshot(token)).account).toBeNull();
    expect((await app.snapshot(parent)).children).toEqual([]);
    expect(db.prepare('SELECT count(*) AS n FROM local_link_codes').get()?.n).toBe(0);
  });
});
