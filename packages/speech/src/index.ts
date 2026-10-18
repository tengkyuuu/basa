/**
 * Speech pipeline (docs/PLAN.md section 8). Owner: James (BB-22 to BB-30).
 * The provider is chosen by the BB-22 bake-off. Everything else talks to this interface only,
 * so swapping provider never touches the learning engine or the UI.
 */
import type { TryAnalysis, WordResult } from '@basabridge/contracts';

/** One word as heard by the speech provider. Times are seconds from the start of the recording. */
export interface HeardWord {
  text: string;
  start: number;
  end: number;
  /** 0..1 */
  confidence: number;
}

export interface TranscribeOptions {
  /** The passage the learner is reading. Providers that support it use this to bias recognition. */
  referenceText: string;
  signal?: AbortSignal;
}

/** A speech provider adapter (BB-24). */
export interface SpeechProvider {
  readonly name: string;
  /** Transcribe a finished recording. A streaming variant is added once the provider is chosen. */
  transcribe(audio: Blob, options: TranscribeOptions): Promise<HeardWord[]>;
}

/**
 * Compare the words that should have been said with the words heard (BB-25).
 * Must handle substitutions, omissions, insertions, repetitions and self-corrections,
 * and must flag low-confidence words instead of counting them as errors.
 */
export function alignWords(expected: string[], heard: HeardWord[]): WordResult[] {
  const normalize = (word: string) => word.toLowerCase().replace(/[^a-z0-9']/g, '');
  if (expected.length > 400 || heard.length > 1000) throw new Error('speech_invalid');
  const costs = Array.from(
    { length: expected.length + 1 },
    () => new Uint16Array(heard.length + 1),
  );
  for (let i = 0; i <= expected.length; i++) costs[i]![0] = i;
  for (let j = 0; j <= heard.length; j++) costs[0]![j] = j;
  for (let i = 1; i <= expected.length; i++)
    for (let j = 1; j <= heard.length; j++) {
      const same = normalize(expected[i - 1]!) === normalize(heard[j - 1]!.text);
      costs[i]![j] = Math.min(
        costs[i - 1]![j - 1]! + Number(!same) * 2,
        costs[i - 1]![j]! + 1,
        costs[i]![j - 1]! + 1,
      );
    }
  const result: WordResult[] = [];
  let i = expected.length,
    j = heard.length;
  while (i > 0 || j > 0) {
    const same = i > 0 && j > 0 && normalize(expected[i - 1]!) === normalize(heard[j - 1]!.text);
    if (i > 0 && j > 0 && costs[i]![j] === costs[i - 1]![j - 1]! + Number(!same) * 2) {
      result.unshift({
        expected: expected[--i]!,
        heard: heard[--j]!.text,
        outcome: same ? 'correct' : 'substitution',
        confidence: heard[j]!.confidence,
        markedMisheard: false,
      });
    } else if (i > 0 && costs[i]![j] === costs[i - 1]![j]! + 1) {
      result.unshift({
        expected: expected[--i]!,
        heard: null,
        outcome: 'omission',
        confidence: 1,
        markedMisheard: false,
      });
    } else {
      const word = heard[--j]!;
      result.unshift({
        expected: null,
        heard: word.text,
        outcome:
          j > 0 && normalize(heard[j - 1]!.text) === normalize(word.text)
            ? 'repetition'
            : 'insertion',
        confidence: word.confidence,
        markedMisheard: false,
      });
    }
  }
  return result;
}

export { transcribeReading, SpeechError } from './groq';
export { recognitionReview } from './corrections';
export { assessPronunciation } from './azure';
export {
  speechProvider,
  speechConfigured,
  speechConsentVersion,
  guardianConsentVersion,
} from './config';

/** Words right per minute. Zero when there is no elapsed time. */
export function wordsPerMinute(wordsRight: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((wordsRight / seconds) * 60);
}

/** Build the per-try summary from aligned words (BB-26). */
export function summariseTry(words: WordResult[], seconds: number): TryAnalysis {
  const expected = words.filter((w) => w.expected !== null);
  const right = expected.filter((w) => w.outcome === 'correct' || w.markedMisheard).length;
  let lastIndex = -1;
  expected.forEach((w, i) => {
    if (w.outcome !== 'omission') lastIndex = i;
  });
  return {
    completed: expected.length > 0 && lastIndex === expected.length - 1,
    lastWordIndex: lastIndex,
    wordsTotal: expected.length,
    wordsRight: right,
    seconds,
    wordsPerMinute: wordsPerMinute(right, seconds),
    words,
  };
}
