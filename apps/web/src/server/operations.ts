import type { RuntimeDatabase } from '@basabridge/db/runtime';
export type Operation = 'story' | 'speech' | 'word';
export type Outcome = 'success' | 'rejected' | 'unavailable' | 'interrupted';
/** Aggregate counters only. No identities, prompts, transcripts or provider error bodies. */
export async function recordOperation(
  db: RuntimeDatabase,
  operation: Operation,
  outcome: Outcome,
  durationMs: number,
) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const duration = Math.max(0, Math.min(600000, Math.round(durationMs)));
    await db
      .prepare(
        'INSERT INTO local_operational_metrics (day,operation,outcome,count,duration_ms) VALUES (?,?,?,1,?) ON CONFLICT(day,operation,outcome) DO UPDATE SET count = local_operational_metrics.count + 1, duration_ms = local_operational_metrics.duration_ms + excluded.duration_ms',
      )
      .run(day, operation, outcome, duration);
    await db
      .prepare('DELETE FROM local_operational_metrics WHERE day < ?')
      .run(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  } catch {
    /* Telemetry failure must not change a learner result or log private exception details. */
  }
}
export async function operationalSummary(db: RuntimeDatabase) {
  return {
    metrics: await db
      .prepare(
        'SELECT day,operation,outcome,count,duration_ms FROM local_operational_metrics ORDER BY day DESC,operation,outcome',
      )
      .all(),
    jobs: await db
      .prepare('SELECT status,COUNT(*) AS count FROM local_generation_jobs GROUP BY status')
      .all(),
  };
}
