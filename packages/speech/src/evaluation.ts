/** Offline transcript comparison. No provider calls or raw text in returned reports. */
export function wordErrors(reference: string, hypothesis: string) {
  const words = (value: string) => value.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  const a = words(reference),
    b = words(hypothesis);
  if (!a.length || a.length > 1000 || b.length > 2000) throw new Error('invalid_evaluation_sample');
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + Number(a[i - 1] !== b[j - 1]),
      );
  let i = a.length,
    j = b.length,
    substitutions = 0,
    deletions = 0,
    insertions = 0;
  while (i || j) {
    if (i && j && dp[i]![j] === dp[i - 1]![j - 1]! + Number(a[i - 1] !== b[j - 1])) {
      if (a[i - 1] !== b[j - 1]) substitutions++;
      i--;
      j--;
    } else if (i && dp[i]![j] === dp[i - 1]![j]! + 1) {
      deletions++;
      i--;
    } else {
      insertions++;
      j--;
    }
  }
  return {
    referenceWords: a.length,
    substitutions,
    deletions,
    insertions,
    wer: (substitutions + deletions + insertions) / a.length,
  };
}
export type EvaluationSample = {
  sampleKey: string;
  consentVerified: true;
  reference: string;
  hypothesis: string;
  ageBand: 'under13' | '13plus' | 'adult';
  accent: 'philippine_english' | 'other_english' | 'not_specified';
  device: 'phone' | 'laptop' | 'headset' | 'other';
  noise: 'quiet' | 'background' | 'other';
};
export function speechEvaluation(samples: EvaluationSample[], minimumGroup = 5) {
  if (
    minimumGroup < 5 ||
    !samples.length ||
    samples.length > 10000 ||
    new Set(samples.map((s) => s.sampleKey)).size !== samples.length ||
    samples.some((s) => !s.consentVerified)
  )
    throw new Error('invalid_evaluation_set');
  const rows = samples.map((sample) => ({
    ...sample,
    errors: wordErrors(sample.reference, sample.hypothesis),
  }));
  const aggregate = (items: typeof rows) => {
    const sums = items.reduce(
      (total, row) => ({
        referenceWords: total.referenceWords + row.errors.referenceWords,
        errors:
          total.errors + row.errors.substitutions + row.errors.deletions + row.errors.insertions,
      }),
      { referenceWords: 0, errors: 0 },
    );
    return { samples: items.length, ...sums, wer: sums.errors / sums.referenceWords };
  };
  const groups = (['ageBand', 'accent', 'device', 'noise'] as const).flatMap((dimension) =>
    [...new Set(rows.map((row) => row[dimension]))].flatMap((value) => {
      const members = rows.filter((row) => row[dimension] === value);
      return members.length < minimumGroup ? [] : [{ dimension, value, ...aggregate(members) }];
    }),
  );
  return {
    kind: 'offline_transcript_comparison',
    minimumGroup,
    interpretation: 'requires_human_review',
    overall: samples.length >= minimumGroup ? aggregate(rows) : null,
    groups,
  };
}
