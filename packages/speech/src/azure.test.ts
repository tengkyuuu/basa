import { afterEach, describe, expect, it, vi } from 'vitest';
import { pcmFromWav, pronunciationAnalysis, assessPronunciation } from './azure';
import { speechConfigured, speechConsentVersion, guardianConsentVersion } from './config';

const phrase = (accuracy = 42) => ({
  NBest: [
    {
      Confidence: 0.9,
      PronunciationAssessment: { FluencyScore: 77 },
      Words: [
        {
          Word: 'cat',
          Offset: 0,
          Duration: 5e6,
          PronunciationAssessment: { AccuracyScore: accuracy },
          Phonemes: [{ Phoneme: 'k', PronunciationAssessment: { AccuracyScore: 35 } }],
        },
        { Word: 'sat', Offset: 5e6, Duration: 5e6, PronunciationAssessment: { AccuracyScore: 90 } },
      ],
    },
  ],
});

function wav(samples = 16000) {
  const b = new ArrayBuffer(44 + samples * 2),
    v = new DataView(b);
  const str = (n: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(n + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, b.byteLength - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples * 2, true);
  return b;
}
afterEach(() => vi.unstubAllEnvs());
describe('acoustic assessment boundary', () => {
  it('keeps phoneme estimates separate from matched words, omissions and comprehension', () => {
    const result = pronunciationAnalysis('cat sat down', 2, [phrase()]);
    expect(result.wordsRight).toBe(2);
    expect(result.words[2]!.outcome).toBe('omission');
    expect(result.pronunciation!.accuracy).toBe(66);
    expect(result.pronunciation!.fluency).toBe(77);
    expect(result.pronunciation!.completeness).toBeCloseTo(200 / 3);
    expect(result.pronunciation!.words[0]).toEqual({
      alignmentIndex: 0,
      accuracy: 42,
      phonemes: [{ phoneme: 'k', accuracy: 35 }],
    });
    expect(JSON.stringify(result)).not.toContain('NBest');
  });
  it('does not attach a recognized substitute’s sounds to an expected word', () => {
    const result = pronunciationAnalysis('dog sat', 2, [phrase()]);
    expect(result.words[0]!.outcome).toBe('substitution');
    expect(result.pronunciation!.words.map((w) => w.alignmentIndex)).toEqual([1]);
  });
  it('rejects invalid scores, timestamps, empty and excessive results', () => {
    expect(() => pronunciationAnalysis('cat', 2, [phrase(101)])).toThrow('speech_invalid');
    expect(() => pronunciationAnalysis('cat', 2, [])).toThrow('speech_invalid');
    expect(() => pronunciationAnalysis('cat', 121, [phrase()])).toThrow('speech_invalid');
    const wrong = phrase();
    wrong.NBest[0]!.Words[0]!.Offset = 10e7;
    expect(() => pronunciationAnalysis('cat', 2, [wrong])).toThrow('speech_invalid');
  });
  it('accepts canonical mono PCM, rejects stereo, corrupt length and overlong audio', () => {
    expect(pcmFromWav(wav()).seconds).toBe(1);
    const stereo = wav();
    new DataView(stereo).setUint16(22, 2, true);
    expect(() => pcmFromWav(stereo)).toThrow('speech_invalid');
    expect(() => pcmFromWav(wav().slice(0, 100))).toThrow('speech_invalid');
    expect(() => pcmFromWav(wav(16000 * 121))).toThrow('speech_invalid');
  });
  it('requires explicit selection and does not use Groq credentials for Azure', async () => {
    vi.stubEnv('SPEECH_PROVIDER', 'azure');
    vi.stubEnv('AZURE_SPEECH_KEY', '');
    vi.stubEnv('GROQ_API_KEY', 'groq-only');
    expect(speechConfigured()).toBe(false);
    expect(speechConsentVersion()).toBe('azure-speech-v1');
    expect(guardianConsentVersion()).toBe('azure-guardian-v1');
    await expect(
      assessPronunciation(new Blob([wav()], { type: 'audio/wav' }), 'cat'),
    ).rejects.toThrow('speech_unavailable');
    vi.stubEnv('AZURE_SPEECH_KEY', 'test');
    vi.stubEnv('AZURE_SPEECH_REGION', 'https://other.test');
    expect(speechConfigured()).toBe(false);
    vi.stubEnv('AZURE_SPEECH_REGION', 'southeastasia');
    expect(speechConfigured()).toBe(true);
  });
});
