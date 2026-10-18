import { it, expect } from 'vitest';
import { recognitionReview } from './corrections';
import { summariseTry } from './index';
it('recomputes uncertainty without turning disputed words into promotion evidence', () => {
  const analysis = summariseTry(
    [
      {
        expected: 'cat',
        heard: 'cap',
        outcome: 'substitution',
        confidence: 0.9,
        markedMisheard: false,
      },
      { expected: 'sat', heard: 'sat', outcome: 'correct', confidence: 0.9, markedMisheard: false },
    ],
    2,
  );
  const raw = analysis.wordsRight;
  analysis.words[0]!.markedMisheard = true;
  expect(recognitionReview(analysis)).toMatchObject({
    flaggedWords: 1,
    originalWordsRight: 1,
    possibleWordsRight: 2,
    referenceWords: 2,
    verified: false,
  });
  expect(analysis.wordsRight).toBe(raw);
  analysis.words[0]!.markedMisheard = false;
  expect(recognitionReview(analysis).possibleWordsRight).toBe(raw);
});
