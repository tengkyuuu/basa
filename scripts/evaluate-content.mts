import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { LearningQuestion } from '../packages/contracts/src/index';
import { LESSON_CONTENT } from '../packages/learn/src/content';
import { PLACEMENT_CONTENT } from '../packages/story-ai/src/placement-bank';
import {
  checkLearningStory,
  generateCheckedStory,
  AIUnavailable,
} from '../packages/story-ai/src/index';
import { PLACEMENT_RULE } from '../packages/levels/src/index';
if (process.argv.includes('--live') && !process.env.GROQ_API_KEY) {
  try {
    process.loadEnvFile('apps/web/.env.local');
  } catch {
    /* Explicit error below never includes credentials. */
  }
}
const live = process.argv.includes('--live');
const results: { id: string; valid: boolean; code: string; milliseconds: number }[] = [];
for (const item of PLACEMENT_CONTENT) {
  try {
    checkLearningStory(item.story, item.level);
    results.push({ id: item.id, valid: true, code: 'structural_pass', milliseconds: 0 });
  } catch {
    results.push({ id: item.id, valid: false, code: 'structural_reject', milliseconds: 0 });
  }
}
for (const lesson of LESSON_CONTENT) {
  try {
    for (const item of lesson.items) {
      LearningQuestion.parse(item.question);
      if (!item.passage.includes(item.question.evidence)) throw new Error();
    }
    results.push({ id: lesson.id, valid: true, code: 'structural_pass', milliseconds: 0 });
  } catch {
    results.push({ id: lesson.id, valid: false, code: 'structural_reject', milliseconds: 0 });
  }
}
if (live) {
  if (!process.env.GROQ_API_KEY)
    throw new Error('GROQ_API_KEY is required for an explicit live evaluation');
  // One bounded generation, including its independent verifier and configured internal retries.
  const start = performance.now();
  try {
    await generateCheckedStory({
      level: PLACEMENT_RULE.defaultStart,
      focus: 'literal',
      recentTitles: [],
    });
    results.push({
      id: 'live-default-level',
      valid: true,
      code: 'provider_checked_pass',
      milliseconds: Math.round(performance.now() - start),
    });
  } catch (error) {
    results.push({
      id: 'live-default-level',
      valid: false,
      code: error instanceof AIUnavailable ? error.code : 'provider_unavailable',
      milliseconds: Math.round(performance.now() - start),
    });
  }
}
const report = {
  at: new Date().toISOString(),
  mode: live ? 'bounded_live_and_structural' : 'structural_only',
  contentVersion: createHash('sha256')
    .update(JSON.stringify({ PLACEMENT_CONTENT, LESSON_CONTENT }))
    .digest('hex'),
  humanSuitabilityReview: 'pending',
  results,
};
await mkdir('.evaluation-reports', { recursive: true });
await writeFile('.evaluation-reports/content.json', JSON.stringify(report, null, 2));
process.stdout.write(
  JSON.stringify({
    mode: report.mode,
    total: results.length,
    passed: results.filter((r) => r.valid).length,
    report: '.evaluation-reports/content.json',
  }) + '\n',
);
if (results.some((r) => !r.valid)) process.exitCode = 1;
