import { guardianConsentVersion } from '@basabridge/speech';
/** Learning and review operations. Learner access is supplied only by ReadingService. */
import { createHash, randomUUID } from 'node:crypto';
import {
  LearningQuestion,
  READING_HELP_PRESETS,
  type Accommodation,
  type SubSkill,
} from '@basabridge/contracts';
import { PLACEMENT_RULE, MIN_LEVEL, MAX_LEVEL, PASS_RULE, SUPPORT_RULE } from '@basabridge/levels';
import { finishPlacement, nextPlacement, startLevelForGrade } from '@basabridge/mastery';
import { bandFor, gapsFromMisses, isLearned, LEARN_RULES, nextReviewAt } from '@basabridge/learn';
import { LESSON_CONTENT, LESSON_COPY, type LessonContent } from '@basabridge/learn/content';
import { PLACEMENT_CONTENT } from '@basabridge/story-ai/placement-bank';
import { checkLearningStory } from '@basabridge/story-ai';
import type { RuntimeDatabase } from '@basabridge/db/runtime';
import type { Account } from './service';
import { ServiceError } from './errors';
import { StaffPrincipal } from './staff';
import type {
  LearnerState,
  ReadingSession,
  LearningSnapshot,
  PublicLesson,
  LessonWork,
  DecisionRecord,
} from '@/lib/domain';

type Access = {
  db: RuntimeDatabase;
  student: (token?: string) => Promise<{ account: Account; state: LearnerState }>;
  actor: (token?: string) => Promise<Account>;
  save: (account: Account, state: LearnerState) => Promise<void>;
  password: (account: Account, password: string) => Promise<void>;
  learner: (id: string) => Promise<Account>;
};
export const contentHash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function decision(
  state: LearnerState,
  kind: DecisionRecord['kind'],
  detail: string,
  values: DecisionRecord['values'] = {},
) {
  state.decisions ??= [];
  state.decisions.push({ id: randomUUID(), at: new Date().toISOString(), kind, detail, values });
  state.decisions = state.decisions.slice(-200);
}
function lessonHash(lesson: LessonContent) {
  return contentHash({ lesson, copy: LESSON_COPY[lesson.subject] });
}
function validateLesson(lesson: LessonContent) {
  if (
    lesson.items.length < 4 ||
    new Set(lesson.items.map((i) => i.id)).size !== lesson.items.length
  )
    throw new Error('invalid_content');
  const seen = new Set<string>();
  for (const item of lesson.items) {
    const question = LearningQuestion.parse(item.question);
    if (
      seen.has(item.passage) ||
      !item.passage.includes(question.evidence) ||
      question.answerIndexes.length !== 1 ||
      new Set(question.options).size !== question.options.length
    )
      throw new Error('invalid_content');
    seen.add(item.passage);
  }
}
export function contentInventory() {
  return [
    ...PLACEMENT_CONTENT.map((item) => ({
      id: item.id,
      kind: 'placement' as const,
      hash: contentHash(item),
      value: item,
      valid: (() => {
        try {
          checkLearningStory(item.story, item.level);
          return true;
        } catch {
          return false;
        }
      })(),
    })),
    ...LESSON_CONTENT.map((item) => ({
      id: item.id,
      kind: 'lesson' as const,
      hash: lessonHash(item),
      value: { ...item, copy: LESSON_COPY[item.subject] },
      valid: (() => {
        try {
          validateLesson(item);
          return true;
        } catch {
          return false;
        }
      })(),
    })),
  ];
}
const inventory = () => contentInventory();
export class LearningWorkflows {
  constructor(private access: Access) {}
  private async admin(secret: string | StaffPrincipal, permission?: 'content' | 'guardian') {
    if (secret instanceof StaffPrincipal) {
      const current = await this.access.db
        .prepare('SELECT role FROM local_staff WHERE id = ? AND active = 1')
        .get(secret.id);
      if (
        !current ||
        current.role !== secret.role ||
        (permission && secret.role !== 'admin' && secret.role !== permission)
      )
        throw new ServiceError('forbidden', 403);
      return;
    }
    throw new ServiceError('staff_required', 401);
  }

  private async approved() {
    const rows = await this.access.db
      .prepare(
        "SELECT content_id, content_hash FROM local_content_reviews WHERE status = 'approved'",
      )
      .all();
    return new Set(
      inventory()
        .filter(
          (item) =>
            item.valid &&
            rows.some((row) => row.content_id === item.id && row.content_hash === item.hash),
        )
        .map((i) => i.id),
    );
  }
  async reviews(secret: string | StaffPrincipal) {
    await this.admin(secret);
    const reviews = await this.access.db.prepare('SELECT * FROM local_content_reviews').all();
    const learners =
      secret instanceof StaffPrincipal && secret.role === 'content'
        ? []
        : await this.access.db
            .prepare(
              "SELECT id, state FROM local_users WHERE role = 'student' AND age_band = 'under13'",
            )
            .all();
    const guardians = learners.flatMap((row) => {
      const state = JSON.parse(String(row.state)) as LearnerState;
      return (state.guardian ?? [])
        .filter((g) => g.status === 'pending')
        .map((g) => ({ learnerId: String(row.id), ...g }));
    });
    return {
      content: (secret instanceof StaffPrincipal && secret.role === 'guardian'
        ? []
        : inventory()
      ).map((i) => ({
        ...i,
        review:
          reviews.find((row) => row.content_id === i.id && row.content_hash === i.hash) ?? null,
      })),
      guardians,
    };
  }
  async reviewContent(
    secret: string | StaffPrincipal,
    input: {
      id: string;
      hash: string;
      reviewer: string;
      status: 'approved' | 'retired';
      confirmed: true;
    },
  ) {
    await this.admin(secret, 'content');
    if (secret instanceof StaffPrincipal) input = { ...input, reviewer: `staff:${secret.id}` };
    if (input.confirmed !== true) throw new ServiceError('invalid', 400);
    const item = inventory().find((i) => i.id === input.id);
    if (!item || item.hash !== input.hash) throw new ServiceError('changed', 409);
    if (!item.valid && input.status === 'approved') throw new ServiceError('invalid_content', 409);
    const at = new Date().toISOString();
    await this.access.db.transaction(async (tx) => {
      await tx
        .prepare(
          'INSERT INTO local_content_reviews (content_id, content_hash, status, reviewer, reviewed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(content_id) DO UPDATE SET content_hash = excluded.content_hash, status = excluded.status, reviewer = excluded.reviewer, reviewed_at = excluded.reviewed_at',
        )
        .run(input.id, item.hash, input.status, input.reviewer, at);
      await tx
        .prepare(
          'INSERT INTO local_review_audit (id, content_id, content_hash, status, reviewer, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(randomUUID(), input.id, item.hash, input.status, input.reviewer, at);
    });
  }
  async guardianApproved(account: Account, state: LearnerState): Promise<boolean> {
    if (account.age_band !== 'under13') return true;
    for (const grant of state.guardian ?? []) {
      if (grant.status !== 'approved' || grant.version !== guardianConsentVersion()) continue;
      const link = await this.access.db
        .prepare(
          "SELECT p.parent_id FROM local_parent_links p JOIN local_users u ON u.id = p.parent_id WHERE p.parent_id = ? AND p.learner_id = ? AND u.role = 'parent' AND u.age_band = 'adult'",
        )
        .get(grant.parentId, account.id);
      if (link) return true;
    }
    return false;
  }
  async requestGuardian(token: string | undefined, learnerId: string, password: string) {
    const parent = await this.access.actor(token);
    if (parent.role !== 'parent' || parent.age_band !== 'adult')
      throw new ServiceError('forbidden', 403);
    await this.access.password(parent, password);
    const link = await this.access.db
      .prepare('SELECT learner_id FROM local_parent_links WHERE parent_id = ? AND learner_id = ?')
      .get(parent.id, learnerId);
    if (!link) throw new ServiceError('forbidden', 403);
    const account = await this.learnerAccount(learnerId);
    if (account.age_band !== 'under13') throw new ServiceError('changed', 409);
    const state = JSON.parse(account.state) as LearnerState;
    state.guardian ??= [];
    if (
      state.guardian.some(
        (g) =>
          g.parentId === parent.id &&
          g.version === guardianConsentVersion() &&
          (g.status === 'pending' || g.status === 'approved'),
      )
    )
      return;
    if (state.guardian.length >= 30) throw new ServiceError('too_many', 429);
    state.guardian.push({
      id: randomUUID(),
      parentId: parent.id,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewer: null,
      method: null,
      version: guardianConsentVersion(),
    });
    decision(state, 'consent', 'guardian_pending');
    await this.access.save(account, state);
  }
  /** Called only after an authorized parent-link check or administrator authentication. */
  private async learnerAccount(id: string) {
    const account = await this.access.learner(id);
    if (account.role !== 'student') throw new ServiceError('not_found', 404);
    return account;
  }
  async reviewGuardian(
    secret: string | StaffPrincipal,
    input: {
      learnerId: string;
      requestId: string;
      reviewer: string;
      status: 'approved' | 'rejected';
      method: 'video_call' | 'signed_form' | null;
      verified: boolean;
    },
  ) {
    await this.admin(secret, 'guardian');
    if (secret instanceof StaffPrincipal) input = { ...input, reviewer: `staff:${secret.id}` };
    if (input.status === 'approved' && (!input.verified || !input.method))
      throw new ServiceError('invalid_request');
    const account = await this.learnerAccount(input.learnerId);
    const state = JSON.parse(account.state) as LearnerState;
    const grant = state.guardian?.find((g) => g.id === input.requestId && g.status === 'pending');
    if (!grant || account.age_band !== 'under13') throw new ServiceError('changed', 409);
    const link = await this.access.db
      .prepare(
        "SELECT p.parent_id FROM local_parent_links p JOIN local_users u ON u.id = p.parent_id WHERE p.parent_id = ? AND p.learner_id = ? AND u.role = 'parent' AND u.age_band = 'adult'",
      )
      .get(grant.parentId, account.id);
    if (!link) throw new ServiceError('forbidden', 403);
    Object.assign(grant, {
      status: input.status,
      method: input.status === 'approved' ? input.method : null,
      reviewer: input.reviewer,
      reviewedAt: new Date().toISOString(),
    });
    decision(
      state,
      'consent',
      input.status === 'approved' ? 'guardian_approved' : 'guardian_rejected',
    );
    await this.access.save(account, state);
  }
  async revokeGuardian(token: string | undefined, learnerId: string) {
    const parent = await this.access.actor(token);
    if (parent.role !== 'parent') throw new ServiceError('forbidden', 403);
    const link = await this.access.db
      .prepare('SELECT learner_id FROM local_parent_links WHERE parent_id = ? AND learner_id = ?')
      .get(parent.id, learnerId);
    if (!link) throw new ServiceError('forbidden', 403);
    const account = await this.learnerAccount(learnerId);
    const state = JSON.parse(account.state) as LearnerState;
    for (const g of state.guardian ?? []) if (g.parentId === parent.id) g.status = 'revoked';
    state.microphoneConsent = null;
    decision(state, 'consent', 'guardian_revoked');
    await this.access.save(account, state);
  }
  private async lesson(id: string) {
    const lesson = LESSON_CONTENT.find((l) => l.id === id);
    if (!lesson || !(await this.approved()).has(id))
      throw new ServiceError('content_unavailable', 409);
    return lesson;
  }
  async startLesson(token: string | undefined, id: string) {
    const { account, state } = await this.access.student(token);
    if (state.sessions.some((s) => s.source === 'placement' && s.phase !== 'done'))
      throw new ServiceError('placement_required', 409);
    const lesson = await this.lesson(id);
    state.lessons ??= {};
    if (state.lessons[id]?.hash === lessonHash(lesson)) return;
    state.lessons[id] = {
      id,
      hash: lessonHash(lesson),
      phase: 'explain',
      index: 0,
      answers: [],
      completedAt: null,
      recheckCorrect: 0,
      recheckTotal: 0,
    };
    await this.access.save(account, state);
  }
  async lessonStep(
    token: string | undefined,
    id: string,
    index: number | null,
    chosen: number[] | null,
  ) {
    const { account, state } = await this.access.student(token);
    const lesson = await this.lesson(id);
    const work = state.lessons?.[id];
    if (!work || work.hash !== lessonHash(lesson)) throw new ServiceError('changed', 409);
    if (work.phase === 'done') return;
    if (work.phase === 'explain') {
      if (chosen) throw new ServiceError('changed', 409);
      work.phase = 'practice';
    } else if (chosen) {
      if (index !== work.index) throw new ServiceError('changed', 409);
      if (work.answers.some((a) => a.item === index)) return;
      if (
        chosen.length !== 1 ||
        !Number.isInteger(chosen[0]) ||
        chosen[0]! < 0 ||
        chosen[0]! >= lesson.items[work.index]!.question.options.length
      )
        throw new ServiceError('choose_answer');
      work.answers.push({
        item: work.index,
        chosen,
        correct: lesson.items[work.index]!.question.answerIndexes.includes(chosen[0]!),
      });
    } else {
      if (index !== work.index || !work.answers.some((a) => a.item === work.index))
        throw new ServiceError('changed', 409);
      work.index++;
      if (work.index === Math.floor(lesson.items.length / 2)) work.phase = 'check';
      if (work.index >= lesson.items.length) {
        work.phase = 'done';
        work.completedAt = new Date().toISOString();
        decision(state, 'lesson', 'lesson_practised', { subject: lesson.subject });
      }
    }
    await this.access.save(account, state);
  }
  recheckTarget(state: LearnerState): { subskill: SubSkill; items: number } | undefined {
    const work = Object.values(state.lessons ?? {}).find(
      (w) =>
        w.completedAt &&
        LESSON_CONTENT.some((l) => l.id === w.id && w.hash === lessonHash(l)) &&
        (!isLearned({
          completed: true,
          recheckCorrect: w.recheckCorrect,
          recheckTotal: w.recheckTotal,
        }) ||
          (!!w.retention?.dueAt && Date.parse(w.retention.dueAt) <= Date.now())),
    );
    const lesson = LESSON_CONTENT.find((l) => l.id === work?.id);
    if (!lesson) return;
    const subject =
      lesson.subject === 'decoding' || lesson.subject === 'word_practice'
        ? 'word_in_context'
        : lesson.subject;
    return { subskill: subject, items: LEARN_RULES.recheckItemsInNextStory };
  }
  applyStoryRecheck(state: LearnerState, session: ReadingSession) {
    if (session.source === 'placement') return;
    for (const work of Object.values(state.lessons ?? {})) {
      if (!work.completedAt || Date.parse(work.completedAt) >= Date.parse(session.startedAt))
        continue;
      const lesson = LESSON_CONTENT.find((l) => l.id === work.id);
      if (!lesson || work.hash !== lessonHash(lesson)) continue;
      const target =
        lesson.subject === 'decoding' || lesson.subject === 'word_practice'
          ? 'word_in_context'
          : lesson.subject;
      if (
        (lesson.subject === 'decoding' || lesson.subject === 'word_practice') &&
        !session.voice?.attempts.some(
          (a) =>
            a.analysis.completed &&
            a.analysis.wordsTotal > 0 &&
            a.analysis.wordsRight / a.analysis.wordsTotal >= PASS_RULE.minWordsRight,
        )
      )
        continue;
      const wasLearned = isLearned({
        completed: true,
        recheckCorrect: work.recheckCorrect,
        recheckTotal: work.recheckTotal,
      });
      if (wasLearned) {
        // Old learned records receive a schedule only when fresh real-story activity occurs.
        work.retention ??= {
          stage: 0,
          dueAt: nextReviewAt(work.completedAt, 0),
          correct: 0,
          total: 0,
          lastCheckedAt: work.completedAt,
        };
        const review = work.retention;
        if (!review.dueAt || Date.parse(session.startedAt) < Date.parse(review.dueAt)) continue;
        const evidence = session.answers.filter(
          (answer) =>
            !answer.rushed && session.story.questions[answer.questionIndex]?.subskill === target,
        );
        review.total += evidence.length;
        review.correct += evidence.filter((answer) => answer.correct).length;
        review.lastCheckedAt = session.completedAt ?? new Date().toISOString();
        if (
          review.total >= LEARN_RULES.recheckItemsInNextStory &&
          review.correct / review.total >= LEARN_RULES.learnedShare
        ) {
          review.stage++;
          review.dueAt = nextReviewAt(review.lastCheckedAt, review.stage);
          review.total = 0;
          review.correct = 0;
          decision(state, 'lesson', 'lesson_retained', { subject: lesson.subject });
        }
        continue;
      }
      for (const answer of session.answers)
        if (!answer.rushed && session.story.questions[answer.questionIndex]?.subskill === target) {
          work.recheckTotal++;
          if (answer.correct) work.recheckCorrect++;
        }
      if (
        isLearned({
          completed: true,
          recheckCorrect: work.recheckCorrect,
          recheckTotal: work.recheckTotal,
        })
      ) {
        const now = session.completedAt ?? new Date().toISOString();
        work.retention = {
          stage: 0,
          dueAt: nextReviewAt(now, 0),
          correct: 0,
          total: 0,
          lastCheckedAt: now,
        };
        decision(state, 'lesson', 'lesson_rechecked', { subject: lesson.subject });
      }
    }
  }
  async startPlacement(token: string | undefined, grade: number | null) {
    const { account, state } = await this.access.student(token);
    if (state.sessions.some((s) => s.phase !== 'done')) throw new ServiceError('changed', 409);
    const completed = state.placementRun?.completedAt;
    if (completed && Date.now() - Date.parse(completed) < PLACEMENT_RULE.retakeAfterDays * 86400000)
      throw new ServiceError('placement_wait', 409);
    const approved = await this.approved();
    if (!PLACEMENT_CONTENT.every((c) => approved.has(c.id)))
      throw new ServiceError('content_unavailable', 409);
    state.placementRun = {
      id: randomUUID(),
      grade,
      startLevel: startLevelForGrade(grade),
      stories: [],
      sessionIds: [],
      completedAt: null,
      result: null,
    };
    state.placement = 'pending';
    await this.access.save(account, state);
    await this.nextPlacementStory(token);
  }
  async nextPlacementStory(token: string | undefined) {
    const { account, state } = await this.access.student(token);
    const run = state.placementRun;
    if (!run || run.completedAt) throw new ServiceError('changed', 409);
    if (state.sessions.some((s) => s.phase !== 'done')) return;
    const next = nextPlacement(run);
    if (next.done) throw new ServiceError('changed', 409);
    const approved = await this.approved();
    const previous = run.stories.at(-1)?.level ?? run.startLevel;
    const used = new Set(
      run.sessionIds.map((id) => state.sessions.find((s) => s.id === id)?.contentId),
    );
    const candidates = PLACEMENT_CONTENT.filter(
      (c) =>
        approved.has(c.id) &&
        !used.has(c.id) &&
        Math.abs(c.level - previous) <= PLACEMENT_RULE.maxStep,
    );
    candidates.sort(
      (a, b) =>
        Math.abs(a.level - next.level!) - Math.abs(b.level - next.level!) ||
        a.id.localeCompare(b.id),
    );
    const candidate = candidates[0];
    if (!candidate) throw new ServiceError('placement_bank_short', 409);
    const session: ReadingSession = {
      id: randomUUID(),
      level: candidate.level,
      story: structuredClone(candidate.story),
      contentId: candidate.id,
      source: 'placement',
      phase: 'reading',
      questionIndex: 0,
      issuedAt: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      answers: [],
      note: null,
      levelAfter: null,
    };
    run.sessionIds.push(session.id);
    state.sessions.push(session);
    await this.access.save(account, state);
  }
  finishPlacementStory(state: LearnerState, session: ReadingSession) {
    const run = state.placementRun;
    if (!run || run.completedAt || !run.sessionIds.includes(session.id))
      throw new ServiceError('changed', 409);
    session.phase = 'done';
    session.completedAt = new Date().toISOString();
    const voice = session.voice?.attempts[0]?.analysis;
    run.stories.push({
      level: session.level,
      answers: session.answers.map((a) => ({
        subskill: session.story.questions[a.questionIndex]!.subskill,
        type: session.story.questions[a.questionIndex]!.type,
        correct: a.correct,
        weight: a.weight,
      })),
      ...(voice?.completed && voice.words.every((w) => w.confidence >= 0.5)
        ? { wordsRightShare: voice.wordsRight / Math.max(1, voice.wordsTotal) }
        : {}),
    });
    if (nextPlacement(run).done) {
      run.result = finishPlacement(run, {
        voice: run.stories.every((s) => s.wordsRightShare != null),
      });
      run.result.level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, run.result.level));
      run.completedAt = new Date().toISOString();
      state.level = run.result.level;
      state.placement = 'complete';
      decision(state, 'placement', 'placement_finished', {
        level: state.level,
        stories: run.stories.length,
      });
    }
  }
  async applyPreset(token: string | undefined, preset: 'standard' | 'more') {
    const { account, state } = await this.access.student(token);
    state.settings = { ...READING_HELP_PRESETS[preset], language: state.settings.language };
    await this.access.save(account, state);
  }
  private publicLesson(lesson: LessonContent, work?: LessonWork): PublicLesson {
    if (work?.hash !== lessonHash(lesson)) work = undefined;
    const item =
      work && work.phase !== 'explain' && work.phase !== 'done'
        ? lesson.items[work.index]
        : undefined;
    const answer = work?.answers.find((a) => a.item === work.index);
    return {
      id: lesson.id,
      reviewDue: !!work?.retention?.dueAt && Date.parse(work.retention.dueAt) <= Date.now(),
      nextReviewAt: work?.retention?.dueAt ?? null,
      subject: lesson.subject,
      band: lesson.band,
      phase: work?.phase ?? 'not_started',
      index: work?.index ?? 0,
      total: lesson.items.length,
      learned:
        !!work &&
        isLearned({
          completed: !!work.completedAt,
          recheckCorrect: work.recheckCorrect,
          recheckTotal: work.recheckTotal,
        }),
      recheckCorrect: work?.recheckCorrect ?? 0,
      recheckTotal: work?.recheckTotal ?? 0,
      item: item
        ? {
            id: item.id,
            passage: item.passage,
            question: {
              type: item.question.type,
              question: item.question.question,
              options: item.question.options,
            },
          }
        : null,
      feedback:
        item && answer
          ? {
              correct: answer.correct,
              evidence: item.question.evidence,
              correctOptions: item.question.answerIndexes.map((i) => item.question.options[i]!),
            }
          : null,
      example:
        work?.phase === 'explain'
          ? {
              passage: lesson.items[0]!.passage,
              question: lesson.items[0]!.question.question,
              answer:
                lesson.items[0]!.question.options[lesson.items[0]!.question.answerIndexes[0]!]!,
            }
          : null,
    };
  }
  async snapshot(account: Account, state: LearnerState): Promise<LearningSnapshot> {
    const approved = await this.approved();
    const lessons = LESSON_CONTENT.filter((l) => approved.has(l.id));
    const completed = state.sessions.filter((s) => s.phase === 'done' && s.source !== 'placement');
    const gaps = gapsFromMisses({
      misses: completed.slice(-8).flatMap((s) =>
        s.answers
          .filter((a) => !a.correct)
          .map((a) => ({
            subskill: s.story.questions[a.questionIndex]!.subskill,
            distractor: s.story.questions[a.questionIndex]!.distractors[a.chosen[0]!],
          })),
      ),
      flaggedWords: this.flaggedWords(state),
    });
    const own = bandFor(state.level);
    const recommendedIds = gaps
      .map(
        (g) =>
          lessons.find((l) => l.subject === g.subject && l.band === own) ??
          lessons.find((l) => l.subject === g.subject),
      )
      .filter((l): l is LessonContent => !!l)
      .slice(0, 3)
      .map((l) => l.id);
    const run = state.placementRun;
    const next = run ? nextPlacement(run) : null;
    return {
      lessons: lessons
        .filter((l) => l.band === own || state.lessons?.[l.id])
        .map((l) => this.publicLesson(l, state.lessons?.[l.id])),
      recommendedIds,
      flaggedWords: this.flaggedWords(state),
      reviewedLessonCount: lessons.length,
      reviewedPlacementCount: PLACEMENT_CONTENT.filter((c) => approved.has(c.id)).length,
      reviewedStoryCount: PLACEMENT_CONTENT.filter(
        (c) =>
          approved.has(c.id) &&
          !state.sessions.some((s) => s.story.title === c.story.title) &&
          Math.abs(c.level - state.level) <= PLACEMENT_RULE.maxStep,
      ).length,
      placement: {
        ready: PLACEMENT_CONTENT.every((c) => approved.has(c.id)),
        active: !!run && !run.completedAt,
        count: run?.stories.length ?? 0,
        maximum: PLACEMENT_RULE.maxStories,
        nextLevel: next?.level ?? null,
        canRetake:
          !run?.completedAt ||
          Date.now() - Date.parse(run.completedAt) >= PLACEMENT_RULE.retakeAfterDays * 86400000,
        result: run?.result ?? null,
        provisional: true,
      },
      guardian: {
        approved: await this.guardianApproved(account, state),
        requests: (state.guardian ?? [])
          .filter((g) => g.version === guardianConsentVersion())
          .map(({ id, status, requestedAt, reviewedAt }) => ({
            id,
            status,
            requestedAt,
            reviewedAt,
          })),
      },
      decisions: state.decisions ?? [],
      wordPractice: {
        sessionId: completed.at(-1)?.id ?? null,
        attempts: (state.wordPractice ?? []).map(({ word, analysis }) => ({ word, analysis })),
      },
    };
  }
  async approvedStory(level: number, recentTitles: string[]) {
    const approved = await this.approved();
    return (
      PLACEMENT_CONTENT.filter(
        (c) =>
          approved.has(c.id) &&
          !recentTitles.includes(c.story.title) &&
          Math.abs(c.level - level) <= PLACEMENT_RULE.maxStep,
      ).sort(
        (a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.id.localeCompare(b.id),
      )[0] ?? null
    );
  }
  flaggedWords(state: LearnerState) {
    return [
      ...new Set(
        state.sessions
          .filter((s) => s.phase === 'done' && s.source !== 'placement')
          .slice(-8)
          .flatMap((s) => {
            const analysis = s.voice?.attempts.at(-1)?.analysis;
            if (!analysis) return [];
            const acoustic = new Set(
              analysis.pronunciation?.words
                .filter((w) => w.accuracy < 60 || w.phonemes.some((p) => p.accuracy < 60))
                .map((w) => w.alignmentIndex),
            );
            return analysis.words
              .filter(
                (w, index) =>
                  w.expected &&
                  w.confidence >= 0.5 &&
                  (w.outcome !== 'correct' || acoustic.has(index)) &&
                  !w.markedMisheard,
              )
              .map((w) => w.expected!);
          }),
      ),
    ].slice(0, 20);
  }
  async recordSupport(
    token: string | undefined,
    id: string,
    accommodation: Accommodation,
    wordIndex?: number,
  ) {
    const { account, state } = await this.access.student(token);
    const session = state.sessions.find((s) => s.id === id);
    if (!session || session.source === 'placement')
      throw new ServiceError('support_unavailable', 403);
    if (accommodation === 'question_read_aloud' && session.phase !== 'answering')
      throw new ServiceError('support_unavailable', 403);
    if (
      accommodation === 'supported_try' &&
      (session.phase !== 'reading' ||
        session.level > SUPPORT_RULE.listenBeforeReadMaxLevel ||
        session.voice?.pending)
    )
      throw new ServiceError('support_unavailable', 403);
    if (
      accommodation === 'word_tap' &&
      (session.phase !== 'reading' ||
        wordIndex == null ||
        !session.voice?.attempts.at(-1)?.analysis.words[wordIndex]?.expected)
    )
      throw new ServiceError('support_unavailable', 403);
    if (accommodation === 'supported_try') session.supportedVoice = true;
    session.supports ??= {};
    const indexes =
      accommodation === 'question_read_aloud'
        ? [session.questionIndex]
        : session.story.questions.map((_, i) => i);
    for (const index of indexes) {
      session.supports[String(index)] ??= [];
      if (!session.supports[String(index)]!.includes(accommodation))
        session.supports[String(index)]!.push(accommodation);
    }
    decision(state, 'support', 'support_recorded', { support: accommodation });
    await this.access.save(account, state);
  }
  async listenPracticeWord(token: string | undefined, word: string) {
    const { account, state } = await this.access.student(token);
    if (!this.flaggedWords(state).includes(word))
      throw new ServiceError('support_unavailable', 403);
    const active = state.sessions.find((s) => s.phase !== 'done');
    if (active?.source === 'placement') throw new ServiceError('support_unavailable', 403);
    if (
      active &&
      (active.story.text.match(/[A-Za-z']+/g) ?? []).some(
        (w) => w.toLowerCase() === word.toLowerCase(),
      )
    ) {
      active.supports ??= {};
      for (let i = active.questionIndex; i < active.story.questions.length; i++) {
        active.supports[String(i)] ??= [];
        if (!active.supports[String(i)]!.includes('word_tap'))
          active.supports[String(i)]!.push('word_tap');
      }
    }
    decision(state, 'support', 'support_recorded', { support: 'word_tap' });
    await this.access.save(account, state);
  }
}
