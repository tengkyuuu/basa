import { z } from 'zod';
import { alignWords, summariseTry } from './index';
import type { TryAnalysis } from '@basabridge/contracts';
import { SPEECH_LIMITS } from './limits';

export class SpeechError extends Error {
  constructor(public code: 'speech_invalid' | 'speech_unavailable' | 'speech_busy' | 'no_speech') {
    super(code);
  }
}
const payload = z.object({
  duration: z.number().positive().max(185),
  words: z
    .array(
      z.object({
        word: z.string().min(1).max(100),
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
      }),
    )
    .max(1000),
  segments: z
    .array(
      z.object({
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
        avg_logprob: z.number().max(0),
        no_speech_prob: z.number().min(0).max(1),
      }),
    )
    .max(500),
});

/** Audio goes only to the consented speech endpoint. Never logged, written to disk or sent to the teacher. */
export async function transcribeReading(
  audio: Blob,
  reference: string,
  transport: typeof fetch = fetch,
): Promise<TryAnalysis> {
  if (!process.env.GROQ_API_KEY) throw new SpeechError('speech_unavailable');
  const formats: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
  };
  const extension = formats[audio.type.split(';')[0]!];
  if (!extension || audio.size < 100 || audio.size > SPEECH_LIMITS.maxBytes)
    throw new SpeechError('speech_invalid');
  const form = new FormData();
  form.set('file', audio, `reading.${extension}`);
  form.set('model', process.env.SPEECH_MODEL || 'whisper-large-v3');
  form.set('language', 'en');
  form.set('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  // Do not supply the reference as a prompt: it can bias ASR into hallucinating a correct reading.
  let response: Response;
  try {
    response = await transport('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new SpeechError('speech_unavailable');
  }
  if (!response.ok)
    throw new SpeechError(response.status === 429 ? 'speech_busy' : 'speech_unavailable');
  const parsed = payload.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new SpeechError('speech_invalid');
  const data = parsed.data;
  const heard = data.words.flatMap((word) => {
    if (word.end < word.start || word.end > data.duration + 1)
      throw new SpeechError('speech_invalid');
    const segment = data.segments.find(
      (s) => s.start <= word.start + 0.1 && s.end >= word.end - 0.1,
    );
    if (!segment || segment.no_speech_prob > 0.6) return [];
    // Segment-derived reliability, NOT a calibrated probability of an individual word being correct.
    const confidence = Math.exp(segment.avg_logprob);
    return (word.word.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g) ?? []).map((text) => ({
      text,
      start: word.start,
      end: word.end,
      confidence,
    }));
  });
  if (!heard.length) throw new SpeechError('no_speech');
  const expected = reference.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g) ?? [];
  return summariseTry(alignWords(expected, heard), data.duration);
}
