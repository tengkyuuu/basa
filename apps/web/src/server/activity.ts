import type { RuntimeDatabase } from '@basabridge/db/runtime';
import type { LearnerState, ReadingSession, RecordedAnswer, LessonWork } from '@/lib/domain';

/** Call only after ReadingService authorizes the account or sharing scope. */
export async function hydrateActivity(
  db: RuntimeDatabase,
  id: string,
  raw: string,
): Promise<string> {
  const state = JSON.parse(raw) as LearnerState & { activityVersion?: number };
  if (state.activityVersion !== 1) return raw;
  const [sessions, answers, lessons, placement] = await Promise.all([
    db
      .prepare(
        'SELECT data FROM local_reading_sessions WHERE learner_id = ? ORDER BY started_at, id',
      )
      .all(id),
    db
      .prepare(
        'SELECT a.session_id, a.data FROM local_reading_answers a JOIN local_reading_sessions s ON s.id = a.session_id WHERE s.learner_id = ? ORDER BY a.question_index',
      )
      .all(id),
    db.prepare('SELECT lesson_id, data FROM local_lesson_work WHERE learner_id = ?').all(id),
    db.prepare('SELECT data FROM local_placement_work WHERE learner_id = ?').get(id),
  ]);
  state.sessions = sessions.map((row) => {
    const session = JSON.parse(String(row.data)) as ReadingSession;
    session.answers = answers
      .filter((a) => a.session_id === session.id)
      .map((a) => JSON.parse(String(a.data)) as RecordedAnswer);
    return session;
  });
  state.lessons = Object.fromEntries(
    lessons.map((row) => [String(row.lesson_id), JSON.parse(String(row.data)) as LessonWork]),
  );
  state.placementRun = placement ? JSON.parse(String(placement.data)) : undefined;
  return JSON.stringify(state);
}

/** Caller owns transaction and revision lock. The first mutation migrates legacy activity atomically. */
export async function persistActivity(
  db: RuntimeDatabase,
  id: string,
  state: LearnerState,
  previousRaw?: string,
) {
  const previous = JSON.parse(previousRaw ?? '{}') as Partial<LearnerState> & {
    activityVersion?: number;
  };
  const migrated = previous.activityVersion === 1;
  const oldSessions = new Map(
    (previous.sessions ?? []).map((session) => [session.id, JSON.stringify(session)]),
  );
  for (const session of state.sessions) {
    if (migrated && oldSessions.get(session.id) === JSON.stringify(session)) continue;
    const data = { ...session, answers: undefined };
    await db
      .prepare(
        'INSERT INTO local_reading_sessions (id,learner_id,data,started_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
      )
      .run(session.id, id, JSON.stringify(data), session.startedAt);
    for (const answer of session.answers)
      await db
        .prepare(
          'INSERT INTO local_reading_answers (session_id,question_index,data) VALUES (?,?,?) ON CONFLICT(session_id,question_index) DO UPDATE SET data = excluded.data',
        )
        .run(session.id, answer.questionIndex, JSON.stringify(answer));
  }
  for (const [lessonId, work] of Object.entries(state.lessons ?? {})) {
    if (migrated && JSON.stringify(previous.lessons?.[lessonId]) === JSON.stringify(work)) continue;
    await db
      .prepare(
        'INSERT INTO local_lesson_work (learner_id,lesson_id,data) VALUES (?,?,?) ON CONFLICT(learner_id,lesson_id) DO UPDATE SET data = excluded.data',
      )
      .run(id, lessonId, JSON.stringify(work));
  }
  if (
    state.placementRun &&
    (!migrated || JSON.stringify(state.placementRun) !== JSON.stringify(previous.placementRun))
  )
    await db
      .prepare(
        'INSERT INTO local_placement_work (learner_id,data) VALUES (?,?) ON CONFLICT(learner_id) DO UPDATE SET data = excluded.data',
      )
      .run(id, JSON.stringify(state.placementRun));
  return JSON.stringify({
    ...state,
    sessions: undefined,
    lessons: undefined,
    placementRun: undefined,
    activityVersion: 1,
  });
}
