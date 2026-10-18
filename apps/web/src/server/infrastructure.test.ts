import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { openLocalDatabase } from '@basabridge/db/local';
import { sqliteRuntime, type RuntimeDatabase } from '@basabridge/db/runtime';
import type * as StoryAI from '@basabridge/story-ai';
import { generateCheckedStory, walkthroughStory } from '@basabridge/story-ai';
import { ReadingService } from './service';
import { contentInventory } from './learning';
vi.mock('@basabridge/story-ai', async (importOriginal) => ({
  ...(await importOriginal<typeof StoryAI>()),
  generateCheckedStory: vi.fn(),
}));
const secret = 'test-bootstrap-secret-not-for-deployment-42';
const password = 'unique-test-staff-password-42';
let db: RuntimeDatabase;
let app: ReadingService;
beforeEach(() => {
  vi.stubEnv('REVIEW_ADMIN_TOKEN', secret);
  vi.stubEnv('GROQ_API_KEY', 'test-only');
  db = sqliteRuntime(openLocalDatabase(':memory:'));
  app = new ReadingService(db);
  vi.mocked(generateCheckedStory).mockReset();
});
afterEach(async () => {
  await db.close();
  vi.unstubAllEnvs();
});
const student = async () => {
  const token = await app.register({
    username: 'test_reader',
    password,
    role: 'student',
    ageBand: '13plus',
  });
  await app.skipPlacement(token);
  return token;
};
describe('durable infrastructure', () => {
  it('consumes staff invitations once, scopes reviews, rejects legacy access and revokes sessions', async () => {
    const admin = await app.staff.enroll(secret, 'administrator', password);
    await expect(app.staff.enroll(secret, 'second_admin', password)).rejects.toThrow(
      'invalid_code',
    );
    await expect(app.learning.reviews(secret)).rejects.toThrow('staff_required');
    const invitation = await app.staff.invite(admin, 'content');
    const content = await app.staff.enroll(invitation, 'content_reviewer', password);
    await expect(app.staff.enroll(invitation, 'replay', password)).rejects.toThrow('invalid_code');
    const actor = await app.staff.principal(content);
    const material = contentInventory()[0]!;
    await app.learning.reviewContent(actor, {
      id: material.id,
      hash: material.hash,
      reviewer: `staff:${actor.id}`,
      status: 'approved',
      confirmed: true,
    });
    expect((await app.learning.reviews(actor)).guardians).toEqual([]);
    await expect(
      app.learning.reviewGuardian(actor, {
        learnerId: randomUUID(),
        requestId: randomUUID(),
        reviewer: 'forged',
        status: 'approved',
        method: 'video_call',
        verified: true,
      }),
    ).rejects.toThrow('forbidden');
    await expect(app.staff.invite(content, 'admin')).rejects.toThrow('forbidden');
    await app.staff.disable(admin, actor.id);
    await expect(app.staff.principal(content)).rejects.toThrow('staff_required');
    await expect(app.learning.reviews(actor)).rejects.toThrow('forbidden');
    expect(
      JSON.stringify(await db.prepare('SELECT * FROM local_staff_sessions').all()),
    ).not.toContain(admin);
  });
  it('invalidates every staff session after password change and protects the last administrator', async () => {
    const admin = await app.staff.enroll(secret, 'administrator', password);
    const second = await app.staff.login('administrator', password);
    const actor = await app.staff.principal(admin);
    await expect(app.staff.disable(admin, actor.id)).rejects.toThrow('forbidden');
    await app.staff.changePassword(admin, password, 'replacement-staff-password-42');
    await expect(app.staff.principal(second)).rejects.toThrow('staff_required');
    await expect(app.staff.login('administrator', password)).rejects.toThrow('credentials');
    await expect(
      app.staff.login('administrator', 'replacement-staff-password-42'),
    ).resolves.toBeTruthy();
  });
  it('normalizes activity atomically, reloads it and cascades deletion', async () => {
    const token = await student();
    await app.start(token, 'walkthrough');
    const snapshot = await app.snapshot(token),
      id = snapshot.account!.id,
      session = snapshot.learner!.session!;
    await app.beginQuestions(token, session.id);
    await app.answer(token, session.id, 0, [0]);
    const raw = await db.prepare('SELECT state FROM local_users WHERE id = ?').get(id);
    expect(JSON.parse(String(raw!.state)).sessions).toBeUndefined();
    expect(
      await db
        .prepare('SELECT session_id FROM local_reading_answers WHERE session_id = ?')
        .get(session.id),
    ).toBeTruthy();
    expect((await new ReadingService(db).snapshot(token)).learner!.session!.phase).toBe('feedback');
    await app.delete(token, password);
    expect(await db.prepare('SELECT * FROM local_reading_answers').all()).toEqual([]);
    expect(await db.prepare('SELECT * FROM local_reading_sessions').all()).toEqual([]);
  });
  it('shares one generation reservation across service instances and reserves quota only once', async () => {
    const token = await student();
    let release!: (story: NonNullable<ReturnType<typeof walkthroughStory>>) => void;
    vi.mocked(generateCheckedStory).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const id = randomUUID(),
      first = app.start(token, 'groq', id);
    await vi.waitFor(() => expect(generateCheckedStory).toHaveBeenCalledTimes(1));
    await expect(new ReadingService(db).start(token, 'groq', randomUUID())).rejects.toThrow(
      'ai_busy',
    );
    release(walkthroughStory(25, [])!);
    await first;
    expect(
      await db.prepare('SELECT status FROM local_generation_jobs WHERE id = ?').get(id),
    ).toMatchObject({ status: 'consumed' });
    expect(generateCheckedStory).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(
        String(
          (await db
            .prepare('SELECT state FROM local_users WHERE id = ?')
            .get((await app.snapshot(token)).account!.id))!.state,
        ),
      ).aiCalls.count,
    ).toBe(1);
  });
  it('recovers a ready story after the original session is revoked without another provider call', async () => {
    const token = await student();
    vi.mocked(generateCheckedStory).mockImplementation(async () => {
      await app.logout(token);
      return walkthroughStory(25, [])!;
    });
    await expect(app.start(token, 'groq')).rejects.toThrow('signed_out');
    const fresh = await app.login('test_reader', password);
    await new ReadingService(db).start(fresh, 'groq');
    expect((await app.snapshot(fresh)).learner!.session!.phase).toBe('reading');
    expect(generateCheckedStory).toHaveBeenCalledTimes(1);
  });
});
