import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sqliteRuntime, type RuntimeDatabase } from '@basabridge/db/runtime';
import { openLocalDatabase } from '@basabridge/db/local';
import { PLACEMENT_RULE } from '@basabridge/levels';
import { LESSON_CONTENT } from '@basabridge/learn/content';
import { PLACEMENT_CONTENT } from '@basabridge/story-ai/placement-bank';
import { ReadingService } from './service';
import type { StaffPrincipal } from './staff';
import { contentInventory } from './learning';
import type { LearnerState } from '@/lib/domain';
const secret = 'test-only-review-token-not-for-deployment-42';
const password = 'test-password-42';
let db: RuntimeDatabase;
let app: ReadingService;
let admin: StaffPrincipal;
beforeEach(async () => {
  vi.stubEnv('REVIEW_ADMIN_TOKEN', secret);
  vi.stubEnv('GROQ_API_KEY', 'test-only-key');
  db = sqliteRuntime(openLocalDatabase(':memory:'));
  app = new ReadingService(db);
  admin = await app.staff.principal(
    await app.staff.enroll(secret, 'test_admin', 'staff-test-password-42'),
  );
});
afterEach(async () => {
  await db.close();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
const register = (username: string, role: 'student' | 'parent' = 'student', ageBand = '13plus') =>
  app.register({ username, password, role, ageBand: role === 'parent' ? 'adult' : ageBand });
async function approve(id: string) {
  const item = contentInventory().find((c) => c.id === id)!;
  await app.learning.reviewContent(admin, {
    id,
    hash: item.hash,
    reviewer: 'test-reviewer',
    status: 'approved',
    confirmed: true,
  });
}
async function finishOrdinary(token: string) {
  const session = (await app.snapshot(token)).learner!.session!;
  const story = PLACEMENT_CONTENT.find((s) => s.story.title === session.title)!.story;
  await app.beginQuestions(token, session.id);
  let now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
  for (let i = 0; i < story.questions.length; i++) {
    now += 20000;
    await app.answer(token, session.id, i, story.questions[i]!.answerIndexes);
    await app.next(token, session.id, i);
  }
  clock.mockRestore();
  return session;
}
describe('reviewed learning workflows', () => {
  it('keeps draft content out of learner snapshots and binds approval to its fingerprint', async () => {
    const token = await register('review_reader');
    expect(contentInventory().every((c) => c.valid)).toBe(true);
    expect((await app.snapshot(token)).learner!.learning!.lessons).toEqual([]);
    await expect(app.learning.reviews('incorrect')).rejects.toMatchObject({
      code: 'staff_required',
    });
    await expect(app.learning.startPlacement(token, null)).rejects.toThrow('content_unavailable');
    const item = contentInventory().find((c) => c.kind === 'lesson')!;
    await expect(
      app.learning.reviewContent(admin, {
        id: item.id,
        hash: '0'.repeat(64),
        reviewer: 'test-reviewer',
        status: 'approved',
        confirmed: true,
      }),
    ).rejects.toThrow('changed');
    await approve(item.id);
    expect((await app.snapshot(token)).learner!.learning!.reviewedLessonCount).toBe(1);
    await db
      .prepare('UPDATE local_content_reviews SET content_hash = ? WHERE content_id = ?')
      .run('stale', item.id);
    expect((await app.snapshot(token)).learner!.learning!.reviewedLessonCount).toBe(0);
    await expect(app.learning.startLesson(token, item.id)).rejects.toThrow('content_unavailable');
  });
  it('resumes placement, hides individual feedback, completes in code and enforces retake timing', async () => {
    const token = await register('placement_reader');
    for (const candidate of PLACEMENT_CONTENT) await approve(candidate.id);
    await app.learning.startPlacement(token, null);
    expect((await app.snapshot(token)).learner!.learning!.placement.active).toBe(true);
    let now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    for (let count = 0; count < PLACEMENT_RULE.maxStories; count++) {
      const snapshot = await app.snapshot(token);
      const session = snapshot.learner!.session!;
      expect(session.voice.allowed).toBe(PLACEMENT_RULE.triesPerStory);
      const candidate = PLACEMENT_CONTENT.find((c) => c.story.title === session.title)!;
      await app.beginQuestions(token, session.id);
      await expect(
        app.learning.recordSupport(token, session.id, 'question_read_aloud'),
      ).rejects.toThrow('support_unavailable');
      for (let i = 0; i < candidate.story.questions.length; i++) {
        const hidden = await app.snapshot(token);
        expect(hidden.learner!.session!.text).toBeNull();
        expect(hidden.learner!.session!.feedback).toBeNull();
        expect(JSON.stringify(hidden)).not.toContain('answerIndexes');
        now += 20000;
        await app.answer(token, session.id, i, candidate.story.questions[i]!.answerIndexes);
      }
      const between = await app.snapshot(token);
      expect(between.learner!.progress.completed).toBe(0);
      expect(between.learner!.session!.result).toBeNull();
      if (between.learner!.learning!.placement.result) break;
      expect(JSON.stringify(await app.export(token))).not.toContain('answerIndexes');
      await app.learning.nextPlacementStory(token);
    }
    clock.mockRestore();
    const final = (await app.snapshot(token)).learner!;
    expect(final.placement).toBe('complete');
    expect(final.learning!.placement.result!.flags).toContain('voice_missing');
    expect(final.level).toBe(final.learning!.placement.result!.level);
    expect(final.learning!.placement.count).toBeGreaterThanOrEqual(PLACEMENT_RULE.minStories);
    await expect(app.learning.startPlacement(token, null)).rejects.toThrow('placement_wait');
  });
  it('does not change a level during lesson practice and learns only from fresh story answers', async () => {
    const token = await register('lesson_reader');
    await app.skipPlacement(token);
    const id = 'key_detail-early';
    await approve(id);
    const level = (await app.snapshot(token)).learner!.level;
    await app.learning.startLesson(token, id);
    const lesson = LESSON_CONTENT.find((l) => l.id === id)!;
    await app.learning.lessonStep(token, id, null, null);
    for (let index = 0; index < lesson.items.length; index++) {
      const before = (await app.snapshot(token)).learner!.learning!.lessons.find(
        (l) => l.id === id,
      )!;
      expect(before.feedback).toBeNull();
      expect(JSON.stringify(before)).not.toContain('answerIndexes');
      await app.learning.lessonStep(token, id, index, lesson.items[index]!.question.answerIndexes);
      expect((await app.snapshot(token)).learner!.level).toBe(level);
      await app.learning.lessonStep(token, id, index, null);
    }
    let work = (await app.snapshot(token)).learner!.learning!.lessons.find((l) => l.id === id)!;
    expect(work.phase).toBe('done');
    expect(work.learned).toBe(false);
    expect((await app.snapshot(token)).learner!.progress.completed).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 2));
    await app.start(token, 'walkthrough');
    await finishOrdinary(token);
    work = (await app.snapshot(token)).learner!.learning!.lessons.find((l) => l.id === id)!;
    expect(work.recheckTotal).toBeGreaterThanOrEqual(2);
    expect(work.learned).toBe(true);
    expect(work.nextReviewAt).toBeTruthy();
    expect(work.reviewDue).toBe(false);
    expect((await app.snapshot(token)).learner!.level).toBe(level);
    const firstDue = work.nextReviewAt!;
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(Date.parse(firstDue) + 1000);
      expect(
        (await app.snapshot(token)).learner!.learning!.lessons.find((l) => l.id === id)!.reviewDue,
      ).toBe(true);
      await app.start(token, 'walkthrough');
      await finishOrdinary(token);
      const retained = (await app.snapshot(token)).learner!.learning!.lessons.find(
        (l) => l.id === id,
      )!;
      expect(retained.learned).toBe(true);
      expect(retained.reviewDue).toBe(false);
      expect(Date.parse(retained.nextReviewAt!)).toBeGreaterThan(Date.parse(firstDue));
    } finally {
      vi.useRealTimers();
    }
  });
  it('records question read-aloud on the affected answer without reducing its evidence weight', async () => {
    const token = await register('supported_reader');
    await app.skipPlacement(token);
    await app.start(token, 'walkthrough');
    const session = (await app.snapshot(token)).learner!.session!;
    await app.beginQuestions(token, session.id);
    await app.learning.recordSupport(token, session.id, 'question_read_aloud');
    await finishOrdinary(token);
    const exported = await app.export(token);
    const state = exported.data as LearnerState;
    expect(state.sessions[0]!.answers[0]!.accommodations).toContain('question_read_aloud');
    expect(state.sessions[0]!.answers[0]!.weight).toBe(1);
    expect(state.sessions[0]!.answers[1]!.accommodations).not.toContain('question_read_aloud');
  });
  it('requires a linked adult, reauthentication, actual review attestation and independent learner consent', async () => {
    const child = await register('young_reader', 'student', 'under13');
    const parent = await register('guardian_reader', 'parent');
    const other = await register('other_guardian', 'parent');
    const learnerId = (await app.snapshot(child)).account!.id;
    await expect(app.learning.requestGuardian(parent, learnerId, password)).rejects.toThrow(
      'forbidden',
    );
    await app.redeem(parent, await app.newLinkCode(child));
    await expect(app.learning.requestGuardian(parent, learnerId, 'incorrect')).rejects.toThrow(
      'credentials',
    );
    await app.learning.requestGuardian(parent, learnerId, password);
    expect((await app.snapshot(parent)).children![0]!.progress).toBeNull();
    expect((await app.snapshot(child)).learner!.learning!.guardian.approved).toBe(false);
    await expect(app.microphoneConsent(child, true)).rejects.toThrow('guardian_required');
    const request = (await app.learning.reviews(admin)).guardians[0]!;
    await expect(
      app.learning.reviewGuardian(admin, {
        learnerId,
        requestId: request.id,
        reviewer: 'test-reviewer',
        status: 'approved',
        method: 'video_call',
        verified: false,
      }),
    ).rejects.toThrow('invalid_request');
    await app.learning.reviewGuardian(admin, {
      learnerId,
      requestId: request.id,
      reviewer: 'test-reviewer',
      status: 'approved',
      method: 'video_call',
      verified: true,
    });
    expect((await app.snapshot(child)).learner!.microphoneConsent).toBe(false);
    await app.microphoneConsent(child, true);
    await app.skipPlacement(child);
    await app.start(child, 'walkthrough');
    const session = (await app.snapshot(child)).learner!.session!;
    await expect(app.speechGate(child, session.id)).resolves.toBeTruthy();
    await expect(app.learning.revokeGuardian(other, learnerId)).rejects.toThrow('forbidden');
    await app.learning.revokeGuardian(parent, learnerId);
    expect((await app.snapshot(child)).learner!.microphoneConsent).toBe(false);
    await expect(app.speechGate(child, session.id)).rejects.toThrow('guardian_required');
    expect((await app.snapshot(parent)).children![0]!.progress).toBeNull();
  });
  it('requires a new guardian review when switching from Groq to Azure', async () => {
    const child = await register('switch_child', 'student', 'under13');
    const parent = await register('switch_parent', 'parent');
    const learnerId = (await app.snapshot(child)).account!.id;
    await app.redeem(parent, await app.newLinkCode(child));
    await app.learning.requestGuardian(parent, learnerId, password);
    const old = (await app.learning.reviews(admin)).guardians[0]!;
    await app.learning.reviewGuardian(admin, {
      learnerId,
      requestId: old.id,
      reviewer: 'test',
      status: 'approved',
      method: 'video_call',
      verified: true,
    });
    await app.microphoneConsent(child, true);
    vi.stubEnv('SPEECH_PROVIDER', 'azure');
    expect((await app.snapshot(child)).learner!.learning!.guardian.approved).toBe(false);
    expect((await app.snapshot(parent)).children![0]!.guardian!.status).toBe('none');
    await expect(app.microphoneConsent(child, true)).rejects.toThrow('guardian_required');
    await app.learning.requestGuardian(parent, learnerId, password);
    const fresh = (await app.learning.reviews(admin)).guardians.find(
      (g) => g.version === 'azure-guardian-v1',
    )!;
    expect(fresh.id).not.toBe(old.id);
    await app.learning.reviewGuardian(admin, {
      learnerId,
      requestId: fresh.id,
      reviewer: 'test',
      status: 'approved',
      method: 'video_call',
      verified: true,
    });
    await app.microphoneConsent(child, true);
    expect((await app.snapshot(child)).learner!.microphoneConsent).toBe(true);
  });
  it('immediately removes guardian access when a parent link is revoked', async () => {
    const child = await register('revoke_child', 'student', 'under13'),
      parent = await register('revoke_parent', 'parent');
    const learnerId = (await app.snapshot(child)).account!.id,
      parentId = (await app.snapshot(parent)).account!.id;
    await app.redeem(parent, await app.newLinkCode(child));
    await app.learning.requestGuardian(parent, learnerId, password);
    const request = (await app.learning.reviews(admin)).guardians[0]!;
    await app.learning.reviewGuardian(admin, {
      learnerId,
      requestId: request.id,
      reviewer: 'test-reviewer',
      status: 'approved',
      method: 'signed_form',
      verified: true,
    });
    await app.microphoneConsent(child, true);
    await app.sharing(child, parentId, false, false, true);
    expect((await app.snapshot(child)).learner!.learning!.guardian.approved).toBe(false);
    await expect(app.microphoneConsent(child, true)).rejects.toThrow('guardian_required');
    await app.redeem(parent, await app.newLinkCode(child));
    expect((await app.snapshot(child)).learner!.learning!.guardian.approved).toBe(false);
  });
});
