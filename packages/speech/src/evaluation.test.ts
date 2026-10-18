import { describe, it, expect } from 'vitest';
import { wordErrors, speechEvaluation, type EvaluationSample } from './evaluation';
describe('offline speech evaluation', () => {
  it('counts substitutions omissions and insertions without returning text', () => {
    expect(wordErrors('The cat sat', 'The dog sat here')).toMatchObject({
      referenceWords: 3,
      substitutions: 1,
      deletions: 0,
      insertions: 1,
    });
    expect(wordErrors('We walked home', 'We home')).toMatchObject({ deletions: 1 });
    expect(wordErrors('Hello, world!', 'hello WORLD')).toMatchObject({ wer: 0 });
    expect(() => wordErrors('', 'one')).toThrow();
  });
  it('suppresses small groups and requires consent attestations and distinct samples', () => {
    const sample: EvaluationSample = {
      sampleKey: 'private-sample',
      consentVerified: true,
      reference: 'The cat sat',
      hypothesis: 'The dog sat',
      ageBand: 'adult',
      accent: 'not_specified',
      device: 'phone',
      noise: 'quiet',
    };
    expect(speechEvaluation([sample]).overall).toBeNull();
    expect(speechEvaluation([sample]).groups).toEqual([]);
    const report = speechEvaluation(
      Array.from({ length: 5 }, (_, i) => ({ ...sample, sampleKey: `sample-${i}` })),
    );
    expect(report.overall?.wer).toBeCloseTo(1 / 3);
    expect(report.groups).toHaveLength(4);
    expect(JSON.stringify(report)).not.toContain('private-sample');
    expect(JSON.stringify(report)).not.toContain('cat');
    expect(() => speechEvaluation([sample, sample])).toThrow();
  });
});
