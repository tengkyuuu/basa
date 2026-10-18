import type { TryAnalysis } from '@basabridge/contracts';
/** Flags express uncertainty, not verified reading success. Never use upper bounds for level evidence. */
export function recognitionReview(analysis: TryAnalysis) {
  const disputed = analysis.words.filter(
    (word) => word.expected !== null && word.outcome !== 'correct' && word.markedMisheard,
  );
  return {
    flaggedWords: disputed.length,
    originalWordsRight: analysis.wordsRight,
    possibleWordsRight: Math.min(analysis.wordsTotal, analysis.wordsRight + disputed.length),
    referenceWords: analysis.wordsTotal,
    verified: false as const,
  };
}
