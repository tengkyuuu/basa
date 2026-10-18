import { afterEach, expect, it, vi } from 'vitest';
import { groqJSON } from '@basabridge/story-ai';
import { readingNote } from './reading-note';
vi.mock('@basabridge/story-ai', () => ({ groqJSON: vi.fn().mockResolvedValue(null) }));
afterEach(() => vi.clearAllMocks());
it('sends read-aloud aggregates without raw heard text, identity or unverified corrections', async () => {
  await readingNote({
    correct: 2,
    total: 3,
    focus: 'literal',
    reading: {
      completed: true,
      lastWordIndex: 0,
      wordsTotal: 1,
      wordsRight: 0,
      seconds: 2,
      wordsPerMinute: 0,
      words: [
        {
          expected: 'cat',
          heard: 'private learner name',
          outcome: 'substitution',
          confidence: 0.9,
          markedMisheard: true,
        },
      ],
      pronunciation: {
        provider: 'azure',
        locale: 'en-US',
        accuracy: 40,
        fluency: 50,
        completeness: 0,
        words: [{ alignmentIndex: 0, accuracy: 40, phonemes: [] }],
      },
    },
  });
  const args = vi.mocked(groqJSON).mock.calls[0]!;
  expect(args[2]).toContain('A read-aloud attempt');
  expect(JSON.stringify(args[3])).not.toContain('private learner name');
  expect(JSON.stringify(args[3])).not.toContain('cat');
  expect(args[3]).toMatchObject({ reading: { substitutions: 1, acoustic: { practiceWords: [] } } });
});
it('never invents pronunciation evidence for a silent session', async () => {
  await readingNote({ correct: 1, total: 2, focus: null });
  const args = vi.mocked(groqJSON).mock.calls[0]!;
  expect(args[2]).toContain('This is a silent reading');
  expect(args[3]).toEqual({ correct: 1, total: 2, focus: null });
});
