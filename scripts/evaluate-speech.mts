import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { speechEvaluation } from '../packages/speech/src/evaluation';
const input = process.argv[2];
if (!input) throw new Error('Usage: evaluate:speech <private-consented-transcript-file.json>');
const sample = z
  .object({
    sampleKey: z.string().min(8).max(128),
    consentVerified: z.literal(true),
    reference: z.string().min(1).max(12000),
    hypothesis: z.string().max(20000),
    ageBand: z.enum(['under13', '13plus', 'adult']),
    accent: z.enum(['philippine_english', 'other_english', 'not_specified']),
    device: z.enum(['phone', 'laptop', 'headset', 'other']),
    noise: z.enum(['quiet', 'background', 'other']),
  })
  .strict();
try {
  const samples = z
    .array(sample)
    .min(1)
    .max(10000)
    .parse(JSON.parse(await readFile(input, 'utf8')));
  const report = speechEvaluation(samples);
  await mkdir('.evaluation-reports', { recursive: true });
  await writeFile('.evaluation-reports/speech.json', JSON.stringify(report, null, 2));
  process.stdout.write(
    'Aggregate report saved to .evaluation-reports/speech.json. Small groups are suppressed. No transcripts are included.\n',
  );
} catch {
  process.stderr.write(
    'Evaluation input is invalid or inaccessible. No input contents were logged.\n',
  );
  process.exitCode = 1;
}
