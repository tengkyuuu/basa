import { SPEECH_LIMITS } from '@basabridge/speech/limits';
/** Authorization boundary (BB-10). Routes never read learner storage directly.
 * SQLite is an explicit local walkthrough adapter, not the production database.
 */
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { openRuntimeDatabase, type RuntimeDatabase } from '@basabridge/db/runtime';
import { ReadingHelp, SUBSKILL_PARENT, LearningStory } from '@basabridge/contracts';
import {
  PLACEMENT_RULE,
  SUPPORT_RULE,
  MIN_LEVEL,
  MAX_LEVEL,
  hasTriesLeft,
  triesFor,
  isPass,
} from '@basabridge/levels';
import {
  assessPronunciation,
  speechProvider,
  speechConfigured,
  speechConsentVersion,
  guardianConsentVersion,
  transcribeReading,
  recognitionReview,
} from '@basabridge/speech';
import {
  COMPREHENSION_SKILLS,
  evidenceWeight,
  focusFromAbility,
  guessFor,
  isRushed,
  itemDifficulty,
  levelReadiness,
  levelToTheta,
  prior,
  summarise,
  updatePosterior,
} from '@basabridge/mastery';
import {
  AIUnavailable,
  answersMatch,
  generateCheckedStory,
  walkthroughStory,
  checkLearningStory,
} from '@basabridge/story-ai';
import { readingNote } from '@basabridge/teacher-ai';
import type { LearnerState, Progress, PublicSession, ReadingSession, Snapshot } from '@/lib/domain';
import { positiveLimit } from './deployment';
import { LearningWorkflows, decision } from './learning';
import { ServiceError } from './errors';
import { hydrateActivity, persistActivity } from './activity';
import { StaffService } from './staff';
import { recordOperation, operationalSummary } from './operations';
export { ServiceError } from './errors';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const derive = promisify(scrypt);
export interface Account {
  id: string;
  username: string;
  password_hash: string;
  role: 'student' | 'parent';
  age_band: string;
  state: string;
  revision: number;
}
interface Link {
  parent_id: string;
  learner_id: string;
  progress: number;
  analysis: number;
}
const newState = (): LearnerState => ({
  level: PLACEMENT_RULE.defaultStart,
  placement: 'pending',
  settings: ReadingHelp.parse({
    simpleWords: PLACEMENT_RULE.defaultStart <= SUPPORT_RULE.simpleWordingMaxLevel,
  }),
  sessions: [],
  aiCalls: { day: '', count: 0 },
});
export function progressFor(state: LearnerState): Progress {
  const posteriors = Object.fromEntries(
    COMPREHENSION_SKILLS.map((skill) => [
      skill,
      prior(
        state.placementRun?.result?.theta ?? levelToTheta(PLACEMENT_RULE.defaultStart),
        state.placementRun?.result?.sd ?? 1.5,
      ),
    ]),
  ) as Record<(typeof COMPREHENSION_SKILLS)[number], ReturnType<typeof prior>>;
  const completed = state.sessions.filter((s) => s.phase === 'done' && s.source !== 'placement');
  for (const session of completed)
    for (const answer of session.answers) {
      const question = session.story.questions[answer.questionIndex]!;
      const skill = SUBSKILL_PARENT[question.subskill];
      posteriors[skill] = updatePosterior(posteriors[skill], {
        difficulty: itemDifficulty(session.level, question.subskill),
        guess: guessFor(question.type),
        correct: answer.correct,
        weight: answer.weight,
      });
    }
  const skills = Object.fromEntries(
    COMPREHENSION_SKILLS.map((skill) => [skill, summarise(posteriors[skill])]),
  ) as Progress['skills'];
  const answers = completed.flatMap((s) => s.answers);
  return {
    completed: completed.length,
    answered: answers.length,
    correct: answers.filter((a) => a.correct).length,
    skills,
    focus: focusFromAbility(skills),
    history: completed
      .map((s) => ({
        id: s.id,
        title: s.story.title,
        level: s.level,
        correct: s.answers.filter((a) => a.correct).length,
        total: s.story.questions.length,
        at: s.completedAt!,
      }))
      .reverse(),
  };
}
// Reading aloud is required once the learner has allowed the microphone and speech is set up.
// Learners who cannot use the microphone (no consent, no guardian approval) are never blocked.
function voiceRequired(state: LearnerState, session: ReadingSession) {
  return (
    session.source !== 'placement' &&
    state.microphoneConsent?.version === speechConsentVersion() &&
    speechConfigured() &&
    (session.voice?.attempts.length ?? 0) === 0
  );
}
export function publicSession(session: ReadingSession, state: LearnerState): PublicSession {
  const q = session.story.questions[session.questionIndex];
  const answer = session.answers.find((a) => a.questionIndex === session.questionIndex);
  return {
    voice: {
      required: voiceRequired(state, session),
      review:
        session.source !== 'placement' &&
        ['reading', 'done'].includes(session.phase) &&
        session.voice?.attempts.at(-1)
          ? recognitionReview(session.voice.attempts.at(-1)!.analysis)
          : null,
      used: session.voice?.attempts.length ?? 0,
      allowed:
        session.source === 'placement' ? PLACEMENT_RULE.triesPerStory : triesFor(session.level),
      latest:
        session.source !== 'placement' && (session.phase === 'reading' || session.phase === 'done')
          ? (session.voice?.attempts.at(-1)?.analysis ?? null)
          : null,
      pending:
        !!session.voice?.pending && Date.now() - session.voice.pending.at < SPEECH_LIMITS.pendingMs,
    },
    id: session.id,
    level: session.level,
    title: session.story.title,
    source: session.source,
    phase: session.phase,
    text:
      session.phase === 'reading' || (session.phase === 'done' && session.source !== 'placement')
        ? session.story.text
        : null,
    questionIndex: session.questionIndex,
    total: session.story.questions.length,
    question:
      session.phase === 'answering' && q
        ? { type: q.type, question: q.question, options: q.options }
        : null,
    feedback:
      session.source !== 'placement' && session.phase === 'feedback' && q && answer
        ? {
            correct: answer.correct,
            correctOptions: q.answerIndexes.map((i) => q.options[i]!),
            evidence: q.evidence,
          }
        : null,
    result:
      session.phase === 'done' && session.source !== 'placement'
        ? {
            correct: session.answers.filter((a) => a.correct).length,
            total: session.story.questions.length,
            note: session.note,
            levelAfter: session.levelAfter ?? session.level,
          }
        : null,
  };
}
export class ReadingService {
  private generating = new Set<string>();
  readonly learning: LearningWorkflows;
  readonly staff: StaffService;
  constructor(
    private db: RuntimeDatabase,
    private inTransaction = false,
  ) {
    this.staff = new StaffService(db);
    this.learning = new LearningWorkflows({
      db,
      actor: (token) => this.actor(token),
      student: (token) => this.student(token),
      save: (account, state) => this.save(account, state),
      password: (account, password) => this.verifyPassword(account, password),
      learner: (id) => this.account(id),
    });
  }
  private async verifyPassword(account: Account, password: string) {
    await this.rateLimit(`password:${account.id}`, 5, 15 * 60000);
    const [salt, expected] = account.password_hash.split(':');
    const derived = (await derive(password, salt!, 64)) as Buffer;
    if (!expected || !timingSafeEqual(derived, Buffer.from(expected, 'hex')))
      throw new ServiceError('credentials', 401);
    const fresh = await this.account(account.id);
    if (fresh.password_hash !== account.password_hash) throw new ServiceError('credentials', 401);
  }
  async healthy() {
    await this.db.prepare('SELECT 1').get();
    return true;
  }
  private async account(id: string): Promise<Account> {
    if (!this.inTransaction)
      return this.db.transaction((tx) => new ReadingService(tx, true).account(id));
    // Serialize against core and activity writes so hydration sees one consistent revision.
    await this.db.prepare('UPDATE local_users SET revision = revision WHERE id = ?').run(id);
    const row = (await this.db
      .prepare('SELECT * FROM local_users WHERE id = ?')
      .get(id)) as unknown as Account | undefined;
    if (!row) throw new ServiceError('signed_out', 401);
    if (row.role === 'student') row.state = await hydrateActivity(this.db, row.id, row.state);
    return row;
  }
  private async actor(token: string | undefined): Promise<Account> {
    if (!token) throw new ServiceError('signed_out', 401);
    const session = (await this.db
      .prepare('SELECT user_id FROM local_auth_sessions WHERE token_hash = ? AND expires_at > ?')
      .get(hash(token), Date.now())) as
      | {
          user_id: string;
        }
      | undefined;
    if (!session) throw new ServiceError('signed_out', 401);
    return await this.account(session.user_id);
  }
  private async student(token: string | undefined): Promise<{
    account: Account;
    state: LearnerState;
  }> {
    const account = await this.actor(token);
    if (account.role !== 'student') throw new ServiceError('forbidden', 403);
    return { account, state: JSON.parse(account.state) as LearnerState };
  }
  private async save(account: Account, state: LearnerState) {
    const work = async (tx: RuntimeDatabase) => {
      const result = await tx
        .prepare('UPDATE local_users SET revision = revision + 1 WHERE id = ? AND revision = ?')
        .run(account.id, account.revision);
      if (result.changes !== 1) throw new ServiceError('changed', 409);
      const core = await persistActivity(tx, account.id, state, account.state);
      await tx.prepare('UPDATE local_users SET state = ? WHERE id = ?').run(core, account.id);
    };
    if (this.inTransaction) await work(this.db);
    else await this.db.transaction(work);
  }
  private async issueToken(id: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.db.prepare('DELETE FROM local_auth_sessions WHERE expires_at <= ?').run(Date.now());
    await this.db
      .prepare('INSERT INTO local_auth_sessions VALUES (?, ?, ?)')
      .run(hash(token), id, Date.now() + 7 * 24 * 60 * 60 * 1000);
    return token;
  }
  async rateLimit(key: string, limit: number, windowMs: number) {
    await this.db.prepare('DELETE FROM local_rate_limits WHERE expires_at <= ?').run(Date.now());
    const row = (await this.db
      .prepare(
        'INSERT INTO local_rate_limits VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = local_rate_limits.count + 1 RETURNING count',
      )
      .get(hash(key), Date.now() + windowMs)) as {
      count: number;
    };
    if (row.count > limit) throw new ServiceError('too_many', 429);
  }
  async register(input: {
    username: string;
    password: string;
    role: 'student' | 'parent';
    ageBand: string;
  }): Promise<string> {
    await this.rateLimit(
      'registration:daily',
      positiveLimit('MAX_DAILY_REGISTRATIONS', 100),
      86400000,
    );
    const salt = randomBytes(16).toString('hex');
    const password = (await derive(input.password, salt, 64)) as Buffer;
    const id = randomUUID();
    try {
      await this.db
        .prepare(
          'INSERT INTO local_users (id, username, password_hash, role, age_band, created_at, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          id,
          input.username.toLowerCase(),
          `${salt}:${password.toString('hex')}`,
          input.role,
          input.ageBand,
          new Date().toISOString(),
          JSON.stringify(newState()),
        );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint failed: local_users.username') ||
          ('code' in error && error.code === '23505'))
      )
        throw new ServiceError('username_taken', 409);
      throw new ServiceError('unavailable', 503);
    }
    return await this.issueToken(id);
  }
  async login(username: string, password: string): Promise<string> {
    const row = (await this.db
      .prepare('SELECT * FROM local_users WHERE username = ?')
      .get(username.toLowerCase())) as unknown as Account | undefined;
    const [salt, expected] = (row?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(
      ':',
    );
    const derived = (await derive(password, salt!, 64)) as Buffer;
    if (!timingSafeEqual(derived, Buffer.from(expected!, 'hex')) || !row)
      throw new ServiceError('credentials', 401);
    return this.db.transaction(async (tx) => {
      // Serialize against password recovery so a login begun with an old password cannot mint a new session afterward.
      const current = await tx
        .prepare(
          'UPDATE local_users SET password_hash = password_hash WHERE id = ? AND password_hash = ? RETURNING id',
        )
        .get(row.id, row.password_hash);
      if (!current) throw new ServiceError('credentials', 401);
      return new ReadingService(tx).issueToken(row.id);
    });
  }
  async logout(token?: string) {
    if (token)
      await this.db
        .prepare('DELETE FROM local_auth_sessions WHERE token_hash = ?')
        .run(hash(token));
  }
  async snapshot(token?: string): Promise<Snapshot> {
    let account: Account;
    try {
      account = await this.actor(token);
    } catch (error) {
      if (!(error instanceof ServiceError && error.code === 'signed_out')) throw error;
      return {
        account: null,
        aiConfigured: !!process.env.GROQ_API_KEY,
        speechProvider: speechProvider(),
        speechConfigured: speechConfigured(),
      };
    }
    const base: Snapshot = {
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        ageBand: account.age_band,
      },
      aiConfigured: !!process.env.GROQ_API_KEY,
      speechProvider: speechProvider(),
      speechConfigured: speechConfigured(),
    };
    if (account.role === 'student') {
      const state = JSON.parse(account.state) as LearnerState;
      const active = state.sessions.find((s) => s.phase !== 'done');
      const latest = active ?? state.sessions.at(-1);
      base.learner = {
        generation: await this.generationStatus(account.id),
        level: state.level,
        placement: state.placement,
        settings: state.settings,
        microphoneConsent: state.microphoneConsent?.version === speechConsentVersion(),
        progress: progressFor(state),
        session: latest ? publicSession(latest, state) : null,
        learning: await this.learning.snapshot(account, state),
      };
      const links = (await this.db
        .prepare('SELECT * FROM local_parent_links WHERE learner_id = ?')
        .all(account.id)) as unknown as Link[];
      base.links = await Promise.all(
        links.map(async (l) => ({
          id: l.parent_id,
          username: (await this.account(l.parent_id)).username,
          progress: !!l.progress,
          analysis: !!l.analysis,
        })),
      );
    } else {
      const links = (await this.db
        .prepare('SELECT * FROM local_parent_links WHERE parent_id = ?')
        .all(account.id)) as unknown as Link[];
      base.children = await Promise.all(
        links.map(async (link) => {
          // Authorization flags are checked before parsing learner data.
          const learner = await this.account(link.learner_id);
          const state =
            link.progress || link.analysis ? (JSON.parse(learner.state) as LearnerState) : null;
          const ownGuardian = ((JSON.parse(learner.state) as LearnerState).guardian ?? [])
            .filter((g) => g.parentId === account.id && g.version === guardianConsentVersion())
            .at(-1);
          return {
            id: learner.id,
            username: learner.username,
            guardian: {
              status: ownGuardian?.status ?? 'none',
              requestId: ownGuardian?.id ?? null,
              under13: learner.age_band === 'under13',
            },
            level: link.progress && state ? state.level : null,
            progress: link.progress && state ? progressFor(state) : null,
            decisions: link.analysis && state ? (state.decisions ?? []) : null,
            analysis:
              link.analysis && state
                ? state.sessions
                    .filter((s) => s.phase === 'done' && s.source !== 'placement')
                    .map((s) => ({
                      id: s.id,
                      title: s.story.title,
                      voice: s.voice?.attempts.at(-1)?.analysis ?? null,
                      answers: s.answers.map((a) => ({
                        ...a,
                        question: s.story.questions[a.questionIndex]!.question,
                      })),
                    }))
                : null,
          };
        }),
      );
    }
    return base;
  }
  async skipPlacement(token?: string) {
    const { account, state } = await this.student(token);
    if (state.placementRun && !state.placementRun.completedAt)
      throw new ServiceError('changed', 409);
    state.placement = 'skipped';
    await this.save(account, state);
  }
  async settings(token: string | undefined, value: unknown) {
    const { account, state } = await this.student(token);
    state.settings = ReadingHelp.parse(value);
    await this.save(account, state);
  }
  async start(
    token: string | undefined,
    source: 'groq' | 'walkthrough' | 'reviewed',
    requestId: string = randomUUID(),
  ) {
    const initial = await this.student(token);
    if (initial.state.placement === 'pending') throw new ServiceError('placement_required');
    if (initial.state.sessions.some((s) => s.phase !== 'done')) return;
    if (initial.state.sessions.length >= 500) throw new ServiceError('history_full', 409);
    if (source !== 'groq') {
      const slot = await this.db
        .prepare(
          'SELECT j.status,j.lease_until FROM local_generation_jobs j JOIN local_generation_slots s ON s.job_id = j.id WHERE s.learner_id = ?',
        )
        .get(initial.account.id);
      if (slot?.status === 'running' && Number(slot.lease_until) > Date.now())
        throw new ServiceError('ai_busy', 429);
      const recent = initial.state.sessions.map((s) => s.story.title);
      const reviewed =
        source === 'reviewed'
          ? await this.learning.approvedStory(initial.state.level, recent)
          : null;
      const story =
        reviewed?.story ??
        (source === 'walkthrough' ? walkthroughStory(initial.state.level, recent) : null);
      if (!story)
        throw new ServiceError(source === 'reviewed' ? 'content_unavailable' : 'bank_empty', 409);
      initial.state.sessions.push(
        this.makeSession(story, source, reviewed?.level ?? initial.state.level, reviewed?.id),
      );
      await this.save(initial.account, initial.state);
      return;
    }
    const reservation = await this.db.transaction(async (tx) => {
      const app = new ReadingService(tx, true);
      await tx
        .prepare('UPDATE local_users SET revision = revision WHERE id = ?')
        .run(initial.account.id);
      const { account, state } = await app.student(token);
      if (state.sessions.some((s) => s.phase !== 'done')) return null;
      const requested = await tx
        .prepare('SELECT * FROM local_generation_jobs WHERE id = ? AND learner_id = ?')
        .get(requestId, account.id);
      const active =
        requested ??
        (await tx
          .prepare(
            'SELECT j.* FROM local_generation_jobs j JOIN local_generation_slots s ON s.job_id = j.id WHERE s.learner_id = ?',
          )
          .get(account.id));
      if (active?.status === 'ready')
        return { id: String(active.id), fresh: false, ready: true, blocked: false };
      if (requested && requested.status !== 'running')
        return { id: String(requested.id), fresh: false, ready: false, blocked: true };
      if (active?.status === 'running') {
        if (Number(active.lease_until) > Date.now())
          return { id: String(active.id), fresh: false, ready: false, blocked: false };
        await tx
          .prepare(
            "UPDATE local_generation_jobs SET status = 'interrupted', error_code = 'generation_interrupted' WHERE id = ? AND status = 'running'",
          )
          .run(String(active.id));
        if (requested) return { id: String(active.id), fresh: false, ready: false, blocked: true };
      }
      if (!process.env.GROQ_API_KEY) throw new AIUnavailable('ai_setup');
      if (this.generating.size >= 2) throw new ServiceError('ai_busy', 429);
      const day = new Date().toISOString().slice(0, 10);
      if (state.aiCalls.day !== day) state.aiCalls = { day, count: 0 };
      if (state.aiCalls.count >= positiveLimit('MAX_DAILY_STORIES_PER_USER', 10))
        throw new ServiceError('daily_limit', 429);
      await app.rateLimit('generation:daily', positiveLimit('MAX_DAILY_STORIES', 60), 86400000);
      state.aiCalls.count++;
      await app.save(account, state);
      const payload = {
        level: state.level,
        focus: progressFor(state).focus,
        recentTitles: state.sessions.map((s) => s.story.title),
        recheck: this.learning.recheckTarget(state),
      };
      await tx
        .prepare(
          "INSERT INTO local_generation_jobs (id,learner_id,status,created_at,lease_until,payload) VALUES (?,?,'running',?,?,?)",
        )
        .run(requestId, account.id, Date.now(), Date.now() + 330000, JSON.stringify(payload));
      await tx
        .prepare(
          'INSERT INTO local_generation_slots (learner_id,job_id) VALUES (?,?) ON CONFLICT(learner_id) DO UPDATE SET job_id = excluded.job_id',
        )
        .run(account.id, requestId);
      return { id: requestId, fresh: true, ready: false, blocked: false };
    });
    if (!reservation) return;
    if (reservation.blocked) throw new ServiceError('generation_interrupted', 409);
    if (!reservation.fresh && !reservation.ready) throw new ServiceError('ai_busy', 429);
    if (reservation.fresh) {
      const started = performance.now();
      this.generating.add(initial.account.id);
      try {
        const row = await this.db
          .prepare('SELECT payload FROM local_generation_jobs WHERE id = ? AND learner_id = ?')
          .get(reservation.id, initial.account.id);
        if (!row) throw new ServiceError('signed_out', 401);
        const story = await generateCheckedStory(JSON.parse(String(row.payload)));
        await this.db
          .prepare(
            "UPDATE local_generation_jobs SET status = 'ready', result = ? WHERE id = ? AND learner_id = ? AND status = 'running'",
          )
          .run(JSON.stringify(story), reservation.id, initial.account.id);
        await recordOperation(this.db, 'story', 'success', performance.now() - started);
      } catch (error) {
        await this.db
          .prepare(
            "UPDATE local_generation_jobs SET status = 'failed', error_code = ? WHERE id = ? AND learner_id = ? AND status = 'running'",
          )
          .run(
            error instanceof AIUnavailable ? error.code : 'unavailable',
            reservation.id,
            initial.account.id,
          );
        await recordOperation(
          this.db,
          'story',
          error instanceof AIUnavailable && error.code === 'ai_invalid'
            ? 'rejected'
            : 'unavailable',
          performance.now() - started,
        );
        throw error;
      } finally {
        this.generating.delete(initial.account.id);
      }
    }
    await this.db.transaction(async (tx) => {
      await tx
        .prepare('UPDATE local_users SET revision = revision WHERE id = ?')
        .run(initial.account.id);
      const app = new ReadingService(tx, true);
      const { account, state } = await app.student(token);
      const job = await tx
        .prepare(
          "SELECT * FROM local_generation_jobs WHERE id = ? AND learner_id = ? AND status = 'ready'",
        )
        .get(reservation.id, account.id);
      if (!job || state.sessions.some((s) => s.phase !== 'done')) return;
      const payload = JSON.parse(String(job.payload));
      if (state.level !== payload.level) throw new ServiceError('changed', 409);
      const story = LearningStory.parse(JSON.parse(String(job.result)));
      checkLearningStory(story, state.level);
      const session = this.makeSession(story, 'groq', state.level);
      state.sessions.push(session);
      await app.save(account, state);
      await tx
        .prepare(
          "UPDATE local_generation_jobs SET status = 'consumed', session_id = ?, result = NULL WHERE id = ?",
        )
        .run(session.id, reservation.id);
    });
  }
  private makeSession(
    story: ReadingSession['story'],
    source: ReadingSession['source'],
    level: number,
    contentId?: string,
  ): ReadingSession {
    return {
      id: randomUUID(),
      level,
      story,
      source,
      contentId,
      phase: 'reading',
      questionIndex: 0,
      issuedAt: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      answers: [],
      note: null,
      levelAfter: null,
    };
  }
  private async generationStatus(id: string) {
    const job = await this.db
      .prepare(
        'SELECT j.status,j.lease_until,j.error_code FROM local_generation_jobs j JOIN local_generation_slots s ON s.job_id = j.id WHERE s.learner_id = ?',
      )
      .get(id);
    if (!job || job.status === 'consumed') return null;
    return {
      status:
        job.status === 'running' && Number(job.lease_until) <= Date.now()
          ? 'interrupted'
          : String(job.status),
      retryAt: Number(job.lease_until),
      error: job.error_code ? String(job.error_code) : null,
    };
  }
  async operations(token?: string) {
    const actor = await this.staff.principal(token);
    if (actor.role !== 'admin') throw new ServiceError('forbidden', 403);
    return operationalSummary(this.db);
  }
  private async measure<T>(operation: 'speech' | 'word', work: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      const result = await work();
      await recordOperation(this.db, operation, 'success', performance.now() - started);
      return result;
    } catch (error) {
      await recordOperation(this.db, operation, 'unavailable', performance.now() - started);
      throw error;
    }
  }
  private current(state: LearnerState, id: string) {
    const session = state.sessions.find((s) => s.id === id);
    if (!session) throw new ServiceError('not_found', 404);
    return session;
  }
  async beginQuestions(token: string | undefined, id: string) {
    const { account, state } = await this.student(token);
    const session = this.current(state, id);
    if (session.phase !== 'reading') return;
    if (session.voice?.pending && Date.now() - session.voice.pending.at < SPEECH_LIMITS.pendingMs)
      throw new ServiceError('speech_busy', 409);
    if (voiceRequired(state, session)) throw new ServiceError('voice_required', 409);
    session.phase = 'answering';
    session.issuedAt = Date.now();
    await this.save(account, state);
  }
  async answer(token: string | undefined, id: string, index: number, chosen: number[]) {
    const { account, state } = await this.student(token);
    const session = this.current(state, id);
    if (session.answers.some((a) => a.questionIndex === index)) return; // Retry cannot duplicate evidence.
    if (session.phase !== 'answering' || session.questionIndex !== index)
      throw new ServiceError('changed', 409);
    const q = session.story.questions[index]!;
    if (
      chosen.length === 0 ||
      new Set(chosen).size !== chosen.length ||
      chosen.some((i) => !Number.isInteger(i) || i < 0 || i >= q.options.length) ||
      (q.type === 'multiple_choice' && chosen.length !== 1) ||
      (q.type === 'order_events' && chosen.length !== q.options.length)
    )
      throw new ServiceError('choose_answer');
    const responseMs = Math.max(0, Date.now() - session.issuedAt);
    const rushed = isRushed(responseMs, `${q.question} ${q.options.join(' ')}`.split(/\s+/).length);
    session.answers.push({
      questionIndex: index,
      chosen,
      correct: answersMatch(q, chosen),
      responseMs,
      rushed,
      weight: evidenceWeight({ rushed, supportedTry: !!session.supportedVoice }),
      accommodations: [
        ...(session.supports?.[String(index)] ?? []),
        ...(session.supportedVoice ? ['supported_try' as const] : []),
      ],
    });
    if (session.source === 'placement') {
      if (index === session.story.questions.length - 1)
        this.learning.finishPlacementStory(state, session);
      else {
        session.questionIndex++;
        session.issuedAt = Date.now();
      }
      await this.save(account, state);
      return;
    }
    session.phase = 'feedback';
    await this.save(account, state);
  }
  async next(token: string | undefined, id: string, index: number) {
    const { account, state } = await this.student(token);
    const session = this.current(state, id);
    if (session.phase !== 'feedback' || session.questionIndex !== index) return;
    if (index < session.story.questions.length - 1) {
      session.questionIndex++;
      session.phase = 'answering';
      session.issuedAt = Date.now();
      await this.save(account, state);
      return;
    }
    session.phase = 'done';
    session.completedAt = new Date().toISOString();
    let posterior = prior(
      state.placementRun?.result?.theta ?? levelToTheta(PLACEMENT_RULE.defaultStart),
      state.placementRun?.result?.sd ?? 1.5,
    );
    let items = 0;
    for (const reading of state.sessions.filter(
      (s) => s.phase === 'done' && s.source !== 'placement',
    ))
      for (const a of reading.answers) {
        const q = reading.story.questions[a.questionIndex]!;
        posterior = updatePosterior(posterior, {
          difficulty: itemDifficulty(reading.level, q.subskill),
          guess: guessFor(q.type),
          correct: a.correct,
          weight: a.weight,
        });
        if (reading.level >= state.level) items++;
      }
    const counted = state.sessions
      .filter((s) => s.phase === 'done' && s.source !== 'placement' && s.level >= state.level)
      .map((s) => {
        const attempts = s.voice?.attempts ?? [];
        const reliable = attempts.filter(
          (a) => a.analysis.completed && a.analysis.words.every((w) => w.confidence >= 0.5),
        );
        const counted = hasTriesLeft(s.level, attempts.length)
          ? attempts.at(-1)
          : reliable.sort(
              (a, b) =>
                b.analysis.wordsRight / Math.max(1, b.analysis.wordsTotal) -
                a.analysis.wordsRight / Math.max(1, a.analysis.wordsTotal),
            )[0];
        const best = counted && reliable.includes(counted) ? counted.analysis : undefined;
        return { session: s, best };
      });
    const readiness = levelReadiness(posterior, state.level, {
      items,
      passedStories: counted.filter(
        ({ session: s, best }) =>
          best &&
          isPass({
            wordsRightShare: best.wordsRight / best.wordsTotal,
            questionsCorrect: s.answers.filter((a) => a.correct).length,
            questionsTotal: s.answers.length,
          }),
      ).length,
      recentWordsRight: counted
        .filter((c) => c.best)
        .map((c) => c.best!.wordsRight / c.best!.wordsTotal),
    });
    // Uncertain or missing voice evidence cannot satisfy decoding prerequisites.
    if (readiness.up) state.level++;
    else if (readiness.down) state.level--;
    state.level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, state.level));
    session.levelAfter = state.level;
    this.learning.applyStoryRecheck(state, session);
    decision(
      state,
      'level',
      session.levelAfter === session.level ? 'level_kept' : 'level_changed',
      {
        before: session.level,
        after: session.levelAfter,
        questions: session.answers.length,
        correct: session.answers.filter((a) => a.correct).length,
      },
    );
    await this.save(account, state);
    if (session.source === 'groq') {
      const note = await readingNote({
        correct: session.answers.filter((a) => a.correct).length,
        total: session.answers.length,
        focus: progressFor(state).focus,
        reading: session.voice?.attempts.at(-1)?.analysis,
      });
      if (note) {
        const fresh = await this.student(token);
        const completed = this.current(fresh.state, id);
        completed.note = note;
        await this.save(fresh.account, fresh.state);
      }
    }
  }
  async newLinkCode(token?: string): Promise<string> {
    const { account } = await this.student(token);
    const code = randomBytes(5).toString('hex').toUpperCase();
    await this.db.prepare('DELETE FROM local_link_codes WHERE learner_id = ?').run(account.id);
    await this.db
      .prepare('INSERT INTO local_link_codes VALUES (?, ?, ?)')
      .run(hash(code), account.id, Date.now() + 24 * 60 * 60 * 1000);
    return code;
  }
  async microphoneConsent(token: string | undefined, consent: boolean) {
    const { account, state } = await this.student(token);
    if (consent && !(await this.learning.guardianApproved(account, state)))
      throw new ServiceError('guardian_required', 403);
    state.microphoneConsent = consent
      ? { version: speechConsentVersion(), at: new Date().toISOString() }
      : null;
    decision(state, 'consent', consent ? 'microphone_allowed' : 'microphone_withdrawn');
    await this.save(account, state);
  }
  async speechGate(token: string | undefined, id: string) {
    const { account, state } = await this.student(token);
    if (!(await this.learning.guardianApproved(account, state)))
      throw new ServiceError('guardian_required', 403);
    if (state.microphoneConsent?.version !== speechConsentVersion())
      throw new ServiceError('speech_consent_required', 403);
    if (!speechConfigured()) throw new ServiceError('speech_unavailable', 503);
    const session = this.current(state, id);
    if (session.phase !== 'reading') throw new ServiceError('changed', 409);
    return { account, state, session };
  }
  async analyseSpeech(token: string | undefined, id: string, requestId: string, audio: Blob) {
    const { account, state, session } = await this.speechGate(token, id);
    const consentVersion = state.microphoneConsent!.version;
    const consentAt = state.microphoneConsent!.at;
    const provider = speechProvider();
    session.voice ??= { attempts: [] };
    if (session.voice.attempts.some((a) => a.id === requestId)) return;
    if (session.voice.pending && Date.now() - session.voice.pending.at < SPEECH_LIMITS.pendingMs)
      throw new ServiceError('speech_busy', 409);
    if (
      session.source === 'placement'
        ? session.voice.attempts.length >= PLACEMENT_RULE.triesPerStory
        : !hasTriesLeft(session.level, session.voice.attempts.length)
    )
      throw new ServiceError('tries_used', 409);
    await this.rateLimit(`speech:${account.id}`, 20, 86_400_000);
    await this.rateLimit(
      'speech:daily',
      positiveLimit('MAX_DAILY_TRANSCRIPTIONS', 100),
      86_400_000,
    );
    session.voice.pending = { id: requestId, at: Date.now() };
    await this.save(account, state);
    try {
      const analysis = await this.measure('speech', () =>
        provider === 'azure'
          ? assessPronunciation(audio, session.story.text)
          : transcribeReading(audio, session.story.text),
      );
      // Consent or account access can be revoked while transcription is in flight.
      const fresh = await this.speechGate(token, id);
      if (
        fresh.state.microphoneConsent?.version !== consentVersion ||
        fresh.state.microphoneConsent?.at !== consentAt
      )
        throw new ServiceError('speech_consent_required', 403);
      if (fresh.session.voice?.pending?.id !== requestId) throw new ServiceError('changed', 409);
      fresh.session.voice.attempts.push({
        id: requestId,
        analysis,
        supported: !!fresh.session.supportedVoice,
      });
      delete fresh.session.voice.pending;
      await this.save(fresh.account, fresh.state);
    } catch (error) {
      try {
        const fresh = await this.student(token);
        const voice = this.current(fresh.state, id).voice;
        if (voice?.pending?.id === requestId) {
          delete voice.pending;
          await this.save(fresh.account, fresh.state);
        }
      } catch {
        /* Revoked access must not restore or retain a result. */
      }
      throw error;
    }
  }
  async redeem(token: string | undefined, code: string) {
    const parent = await this.actor(token);
    if (parent.role !== 'parent') throw new ServiceError('forbidden', 403);
    await this.rateLimit(`link:${parent.id}`, 8, 60000);
    await this.db.transaction(async (tx) => {
      const found = (await tx
        .prepare(
          'DELETE FROM local_link_codes WHERE code_hash = ? AND expires_at > ? RETURNING learner_id',
        )
        .get(hash(code.toUpperCase().trim()), Date.now())) as
        | {
            learner_id: string;
          }
        | undefined;
      if (!found) throw new ServiceError('invalid_code');
      await tx
        .prepare(
          'INSERT INTO local_parent_links (parent_id, learner_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        )
        .run(parent.id, found.learner_id);
    });
  }
  async wordGate(token: string | undefined, id: string, word: string) {
    const { account, state } = await this.student(token);
    if (!(await this.learning.guardianApproved(account, state)))
      throw new ServiceError('guardian_required', 403);
    if (state.microphoneConsent?.version !== speechConsentVersion())
      throw new ServiceError('speech_consent_required', 403);
    if (!speechConfigured()) throw new ServiceError('speech_unavailable', 503);
    const session = this.current(state, id);
    if (
      session.phase !== 'done' ||
      session.source === 'placement' ||
      state.sessions.some((s) => s.source === 'placement' && s.phase !== 'done') ||
      !this.learning.flaggedWords(state).includes(word)
    )
      throw new ServiceError('support_unavailable', 403);
    return { account, state, session };
  }
  async analyseWord(
    token: string | undefined,
    id: string,
    requestId: string,
    word: string,
    audio: Blob,
  ) {
    const { account, state } = await this.wordGate(token, id, word);
    const consentVersion = state.microphoneConsent!.version;
    const consentAt = state.microphoneConsent!.at;
    const provider = speechProvider();
    if (state.wordPractice?.some((a) => a.id === requestId)) return;
    await this.rateLimit(`speech:${account.id}`, 20, 86_400_000);
    await this.rateLimit(
      'speech:daily',
      positiveLimit('MAX_DAILY_TRANSCRIPTIONS', 100),
      86_400_000,
    );
    const analysis = await this.measure('word', () =>
      provider === 'azure' ? assessPronunciation(audio, word) : transcribeReading(audio, word),
    );
    const fresh = await this.wordGate(token, id, word);
    if (
      fresh.state.microphoneConsent?.version !== consentVersion ||
      fresh.state.microphoneConsent?.at !== consentAt
    )
      throw new ServiceError('speech_consent_required', 403);
    if (fresh.state.wordPractice?.some((a) => a.id === requestId)) return;
    fresh.state.wordPractice ??= [];
    fresh.state.wordPractice.push({ id: requestId, word, analysis, at: new Date().toISOString() });
    fresh.state.wordPractice = fresh.state.wordPractice.slice(-20);
    await this.save(fresh.account, fresh.state);
  }
  async markMisheard(
    token: string | undefined,
    id: string,
    index: number,
    marked: boolean,
    learnerId?: string,
  ) {
    const actor = await this.actor(token);
    let account = actor;
    if (actor.role === 'parent') {
      if (!learnerId) throw new ServiceError('forbidden', 403);
      const link = await this.db
        .prepare('SELECT analysis FROM local_parent_links WHERE parent_id = ? AND learner_id = ?')
        .get(actor.id, learnerId);
      if (!link?.analysis) throw new ServiceError('forbidden', 403);
      account = await this.account(learnerId);
    } else if (learnerId && learnerId !== actor.id) throw new ServiceError('forbidden', 403);
    const state = JSON.parse(account.state) as LearnerState;
    const session = this.current(state, id);
    if (
      session.source === 'placement' ||
      (actor.role === 'parent' && session.phase !== 'done') ||
      !['reading', 'done'].includes(session.phase)
    )
      throw new ServiceError('support_unavailable', 403);
    const word = session.voice?.attempts.at(-1)?.analysis.words[index];
    if (!word || !word.expected) throw new ServiceError('changed', 409);
    word.markedMisheard = marked;
    session.correctionAudit ??= [];
    session.correctionAudit.push({
      at: new Date().toISOString(),
      wordIndex: index,
      marked,
      actorRole: actor.role,
    });
    session.correctionAudit = session.correctionAudit.slice(-200);
    await this.save(account, state);
  }
  async sharing(
    token: string | undefined,
    parentId: string,
    progress: boolean,
    analysis: boolean,
    revoke: boolean,
  ) {
    const { account, state } = await this.student(token);
    if (revoke) {
      for (const grant of state.guardian ?? [])
        if (grant.parentId === parentId) grant.status = 'revoked';
      if (account.age_band === 'under13') state.microphoneConsent = null;
      decision(state, 'consent', 'guardian_revoked');
      await this.db.transaction(async (tx) => {
        await tx
          .prepare('DELETE FROM local_parent_links WHERE parent_id = ? AND learner_id = ?')
          .run(parentId, account.id);
        await new ReadingService(tx, true).save(account, state);
      });
    } else
      await this.db
        .prepare(
          'UPDATE local_parent_links SET progress = ?, analysis = ? WHERE parent_id = ? AND learner_id = ?',
        )
        .run(Number(progress), Number(analysis), parentId, account.id);
  }
  async export(token?: string) {
    const actor = await this.actor(token);
    const state = actor.role === 'student' ? (JSON.parse(actor.state) as LearnerState) : null;
    // A data export must not disclose answers or the hidden passage during an active quiz.
    const data = state
      ? {
          ...state,
          placementRun: state.placementRun?.completedAt ? state.placementRun : undefined,
          sessions: state.sessions.filter(
            (s) =>
              s.phase === 'done' && (s.source !== 'placement' || state.placementRun?.completedAt),
          ),
        }
      : (await this.snapshot(token)).children;
    return {
      account: { username: actor.username, role: actor.role, ageBand: actor.age_band },
      data,
    };
  }
  async delete(token: string | undefined, password: string) {
    const actor = await this.actor(token);
    await this.rateLimit(`password:${actor.id}`, 5, 15 * 60000);
    const [salt, expected] = actor.password_hash.split(':');
    const derived = (await derive(password, salt!, 64)) as Buffer;
    if (!timingSafeEqual(derived, Buffer.from(expected!, 'hex')))
      throw new ServiceError('credentials', 401);
    await this.actor(token);
    await this.db
      .prepare('DELETE FROM local_users WHERE id = ? AND password_hash = ?')
      .run(actor.id, actor.password_hash);
  }
  async recoveryCode(token: string | undefined, password: string) {
    const actor = await this.actor(token);
    await this.rateLimit(`password:${actor.id}`, 5, 15 * 60000);
    const [salt, expected] = actor.password_hash.split(':');
    const derived = (await derive(password, salt!, 64)) as Buffer;
    if (!timingSafeEqual(derived, Buffer.from(expected!, 'hex')))
      throw new ServiceError('credentials', 401);
    // Reauthorize after asynchronous password derivation.
    const fresh = await this.actor(token);
    if (fresh.password_hash !== actor.password_hash) throw new ServiceError('changed', 409);
    const code = randomBytes(20).toString('hex').toUpperCase();
    const created = await this.db
      .prepare(
        `INSERT INTO local_recovery_codes (user_id, code_hash, created_at)
      SELECT id, ?, ? FROM local_users WHERE id = ? AND password_hash = ?
      ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, created_at = excluded.created_at`,
      )
      .run(hash(code), Date.now(), actor.id, actor.password_hash);
    if (created.changes !== 1) throw new ServiceError('changed', 409);
    return code;
  }
  async recover(username: string, code: string, password: string) {
    await this.rateLimit(`recovery:${username.toLowerCase()}`, 5, 15 * 60000);
    const row = (await this.db
      .prepare(
        `SELECT u.id, r.code_hash FROM local_users u
      JOIN local_recovery_codes r ON r.user_id = u.id WHERE u.username = ?`,
      )
      .get(username.toLowerCase())) as
      | {
          id: string;
          code_hash: string;
        }
      | undefined;
    const submitted = hash(code.replace(/[\s-]/g, '').toUpperCase());
    if (
      !timingSafeEqual(
        Buffer.from(submitted, 'hex'),
        Buffer.from(row?.code_hash ?? '0'.repeat(64), 'hex'),
      ) ||
      !row
    )
      throw new ServiceError('recovery_invalid', 401);
    const salt = randomBytes(16).toString('hex');
    const derived = (await derive(password, salt, 64)) as Buffer;
    return this.db.transaction(async (tx) => {
      const used = await tx
        .prepare('DELETE FROM local_recovery_codes WHERE user_id = ? AND code_hash = ?')
        .run(row.id, submitted);
      if (used.changes !== 1) throw new ServiceError('recovery_invalid', 401);
      await tx
        .prepare('UPDATE local_users SET password_hash = ? WHERE id = ?')
        .run(`${salt}:${derived.toString('hex')}`, row.id);
      await tx.prepare('DELETE FROM local_auth_sessions WHERE user_id = ?').run(row.id);
      const token = await new ReadingService(tx).issueToken(row.id);
      return token;
    });
  }
}
const singleton = globalThis as unknown as {
  basabridgeService?: Promise<ReadingService>;
};
export function service() {
  return (singleton.basabridgeService ??= openRuntimeDatabase()
    .then((db) => new ReadingService(db))
    .catch(() => {
      singleton.basabridgeService = undefined;
      throw new ServiceError('unavailable', 503);
    }));
}
export { AIUnavailable };
