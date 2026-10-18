import { z } from 'zod';
import { TryAnalysis } from '@basabridge/contracts';
import { alignWords, summariseTry } from './index';
import { SpeechError } from './groq';
import { SPEECH_LIMITS } from './limits';

const score = z.number().min(0).max(100);
const utterance = z.object({
  NBest: z
    .array(
      z.object({
        Confidence: z.number().min(0).max(1),
        PronunciationAssessment: z.object({ FluencyScore: score }),
        Words: z
          .array(
            z.object({
              Word: z.string().min(1).max(100),
              Offset: z.number().nonnegative(),
              Duration: z.number().positive(),
              PronunciationAssessment: z.object({ AccuracyScore: score }),
              Phonemes: z
                .array(
                  z.object({
                    Phoneme: z.string().min(1).max(30),
                    PronunciationAssessment: z.object({ AccuracyScore: score }),
                  }),
                )
                .max(100)
                .optional(),
            }),
          )
          .min(1)
          .max(1000),
      }),
    )
    .min(1)
    .max(10),
});

/** Parse only allowlisted fields. Raw transcripts and provider diagnostics are never logged. */
export function pronunciationAnalysis(
  reference: string,
  seconds: number,
  results: unknown[],
): TryAnalysis {
  const parsed = z.array(utterance).min(1).max(400).safeParse(results);
  if (
    !parsed.success ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    seconds > SPEECH_LIMITS.azureMaxSeconds
  )
    throw new SpeechError('speech_invalid');
  const phrases = parsed.data.map((r) => r.NBest[0]!);
  const heard = phrases.flatMap((p) =>
    p.Words.map((w) => ({
      text: w.Word,
      start: w.Offset / 1e7,
      end: (w.Offset + w.Duration) / 1e7,
      confidence: p.Confidence,
      acoustic: w,
    })),
  );
  if (
    heard.length > 1000 ||
    heard.some((w, i) => w.end > seconds + 1 || (i > 0 && w.start < heard[i - 1]!.start))
  )
    throw new SpeechError('speech_invalid');
  const expected = reference.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g) ?? [];
  const analysis = summariseTry(alignWords(expected, heard), seconds);
  let heardIndex = 0;
  const words = analysis.words.flatMap((w, alignmentIndex) => {
    if (w.heard === null) return [];
    const acoustic = heard[heardIndex++]!.acoustic;
    // Substitutions/insertions are reported by alignment, not scored as the expected sound.
    if (w.outcome !== 'correct') return [];
    return [
      {
        alignmentIndex,
        accuracy: acoustic.PronunciationAssessment.AccuracyScore,
        phonemes: (acoustic.Phonemes ?? []).map((p) => ({
          phoneme: p.Phoneme,
          accuracy: p.PronunciationAssessment.AccuracyScore,
        })),
      },
    ];
  });
  const duration = phrases.reduce((sum, p) => sum + p.Words.reduce((n, w) => n + w.Duration, 0), 0);
  return TryAnalysis.parse({
    ...analysis,
    pronunciation: {
      provider: 'azure',
      locale: 'en-US',
      // Word-weighted accuracy and speech-duration-weighted fluency; not Azure's overall score.
      accuracy: words.length ? words.reduce((sum, w) => sum + w.accuracy, 0) / words.length : null,
      fluency:
        phrases.reduce(
          (sum, p) =>
            sum +
            p.PronunciationAssessment.FluencyScore * p.Words.reduce((n, w) => n + w.Duration, 0),
          0,
        ) / duration,
      completeness: expected.length ? (100 * analysis.wordsRight) / expected.length : 0,
      words,
    },
  });
}

/** Accept our canonical PCM WAV only. Reject malformed formats before any network request. */
export function pcmFromWav(buffer: ArrayBuffer): { pcm: ArrayBuffer; seconds: number } {
  const v = new DataView(buffer);
  const ascii = (at: number, value: string) =>
    [...value].every((c, i) => v.getUint8(at + i) === c.charCodeAt(0));
  if (
    buffer.byteLength < 100 ||
    buffer.byteLength > SPEECH_LIMITS.maxBytes ||
    !ascii(0, 'RIFF') ||
    v.getUint32(4, true) !== buffer.byteLength - 8 ||
    !ascii(8, 'WAVE') ||
    !ascii(12, 'fmt ') ||
    v.getUint32(16, true) !== 16 ||
    v.getUint16(20, true) !== 1 ||
    v.getUint16(22, true) !== 1 ||
    v.getUint32(24, true) !== 16000 ||
    v.getUint32(28, true) !== 32000 ||
    v.getUint16(32, true) !== 2 ||
    v.getUint16(34, true) !== 16 ||
    !ascii(36, 'data') ||
    v.getUint32(40, true) !== buffer.byteLength - 44 ||
    (buffer.byteLength - 44) % 2 !== 0
  )
    throw new SpeechError('speech_invalid');
  const seconds = (buffer.byteLength - 44) / 32000;
  if (seconds > SPEECH_LIMITS.azureMaxSeconds) throw new SpeechError('speech_invalid');
  return { pcm: buffer.slice(44), seconds };
}

/** Continuous SDK mode handles passages longer than 30 seconds. Audio exists only in memory. */
export async function assessPronunciation(audio: Blob, reference: string): Promise<TryAnalysis> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION ?? '';
  if (!key || !/^[a-z][a-z0-9]{1,40}$/.test(region)) throw new SpeechError('speech_unavailable');
  const expectedWords = reference.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g) ?? [];
  if (!expectedWords.length || expectedWords.length > 400 || reference.length > 20000)
    throw new SpeechError('speech_invalid');
  if (audio.type !== 'audio/wav') throw new SpeechError('speech_invalid');
  const { pcm, seconds } = pcmFromWav(await audio.arrayBuffer());
  const sdk = await import('microsoft-cognitiveservices-speech-sdk');
  sdk.SpeechRecognizer.enableTelemetry(false);
  const config = sdk.SpeechConfig.fromSubscription(key, region);
  config.speechRecognitionLanguage = 'en-US';
  config.outputFormat = sdk.OutputFormat.Detailed;
  const push = sdk.AudioInputStream.createPushStream(
    sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1),
  );
  const input = sdk.AudioConfig.fromStreamInput(push);
  const recognizer = new sdk.SpeechRecognizer(config, input);
  try {
    const assessment = new sdk.PronunciationAssessmentConfig(
      reference,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      false,
    );
    assessment.phonemeAlphabet = 'IPA';
    assessment.applyTo(recognizer);
    // No optional prosody add-on, audio logging, storage or provider diagnostics.
    const results = await new Promise<unknown[]>((resolve, reject) => {
      const results: unknown[] = [];
      let settled = false;
      const finish = (error?: SpeechError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(results);
      };
      const timeout = setTimeout(() => finish(new SpeechError('speech_unavailable')), 200_000);
      recognizer.recognized = (_sender, event) => {
        if (settled || event.result.reason !== sdk.ResultReason.RecognizedSpeech) return;
        try {
          results.push(
            JSON.parse(
              event.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult),
            ),
          );
          if (results.length > 400) finish(new SpeechError('speech_invalid'));
        } catch {
          finish(new SpeechError('speech_invalid'));
        }
      };
      recognizer.canceled = (_sender, event) =>
        finish(
          event.reason === sdk.CancellationReason.EndOfStream
            ? undefined
            : new SpeechError('speech_unavailable'),
        );
      recognizer.sessionStopped = () => finish();
      recognizer.startContinuousRecognitionAsync(
        () => {
          if (settled) return;
          try {
            push.write(pcm);
            push.close();
          } catch {
            finish(new SpeechError('speech_unavailable'));
          }
        },
        () => finish(new SpeechError('speech_unavailable')),
      );
    });
    if (!results.length) throw new SpeechError('no_speech');
    return pronunciationAnalysis(reference, seconds, results);
  } finally {
    recognizer.close();
    input.close();
    push.close();
  }
}
