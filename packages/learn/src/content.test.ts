import { describe, it, expect } from 'vitest';
import { LearningQuestion } from '@basabridge/contracts';
import { LESSON_CONTENT } from './content';
import { nextReviewAt } from './index';
describe('draft lesson progression', () => {
  it('has distinct guided and fresh passages in every lesson and distinct band contexts', () => {
    expect(LESSON_CONTENT).toHaveLength(33);
    for (const lesson of LESSON_CONTENT) {
      expect(lesson.status).toBe('draft');
      expect(new Set(lesson.items.map((i) => i.passage)).size).toBe(4);
      for (const item of lesson.items) {
        expect(() => LearningQuestion.parse(item.question)).not.toThrow();
        expect(item.passage).toContain(item.question.evidence);
      }
      const otherBands = LESSON_CONTENT.filter(
        (l) => l.subject === lesson.subject && l.band !== lesson.band,
      );
      for (const other of otherBands)
        expect(lesson.items.map((i) => i.passage)).not.toEqual(other.items.map((i) => i.passage));
    }
  });
  it('uses longer reasoning contexts for later comprehension practice without claiming calibration', () => {
    const mean = (band: string) => {
      const passages = LESSON_CONTENT.filter(
        (l) => l.band === band && !['word_practice', 'decoding'].includes(l.subject),
      ).flatMap((l) => l.items.map((i) => i.passage.split(/\s+/).length));
      return passages.reduce((sum, n) => sum + n, 0) / passages.length;
    };
    expect(mean('middle')).toBeGreaterThan(mean('early'));
    expect(mean('advanced')).toBeGreaterThan(mean('middle'));
  });
  it('schedules fresh evidence after one three and seven days with a bounded final stage', () => {
    expect(nextReviewAt('2026-10-18T10:00:00.000Z', 0)).toBe('2026-10-19T10:00:00.000Z');
    expect(nextReviewAt('2026-10-18T10:00:00.000Z', 1)).toBe('2026-10-21T10:00:00.000Z');
    expect(nextReviewAt('2026-10-18T10:00:00.000Z', 2)).toBe('2026-10-25T10:00:00.000Z');
    expect(nextReviewAt('2026-10-18T10:00:00.000Z', 3)).toBeNull();
  });
});
