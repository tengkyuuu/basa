import { afterEach, describe, expect, it, vi } from 'vitest';
import { alignWords, summariseTry, transcribeReading } from './index';
afterEach(() => vi.unstubAllEnvs());

describe('reading alignment', () => {
  it('aligns substitutions, omissions, extra words and repeats deterministically', () => {
    const heard = ['The', 'cat', 'cat', 'sat'].map((text, i) => ({
      text,
      start: i,
      end: i + 1,
      confidence: 0.9,
    }));
    const result = alignWords(['The', 'dog', 'sat', 'here'], heard);
    expect(result.filter((w) => w.expected !== null).map((w) => w.expected)).toEqual([
      'The',
      'dog',
      'sat',
      'here',
    ]);
    expect(result.filter((w) => w.outcome === 'omission').map((w) => w.expected)).toContain('here');
    expect(summariseTry(result, 4)).toMatchObject({
      completed: false,
      wordsRight: 2,
      wordsTotal: 4,
    });
  });
  it('ignores case and punctuation without losing word positions or low reliability', () => {
    const result = alignWords(
      ['Hello,', 'world!'],
      [
        { text: 'hello', start: 0, end: 1, confidence: 0.9 },
        { text: 'world', start: 1, end: 2, confidence: 0.2 },
      ],
    );
    expect(result.map((w) => w.outcome)).toEqual(['correct', 'correct']);
    expect(result[1]!.confidence).toBe(0.2);
  });
});
describe('Groq speech adapter', () => {
  it('sends only audio to the speech endpoint and uses provider duration and timestamps', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    const transport = vi.fn<typeof fetch>(async (_url, init) => {
      const form = init!.body as FormData;
      expect(form.get('prompt')).toBeNull();
      expect((form.get('file') as File).name).toBe('reading.webm');
      expect(form.get('model')).toBe('whisper-large-v3');
      return Response.json({
        duration: 3,
        words: [
          { word: 'The', start: 0, end: 0.5 },
          { word: 'dog', start: 0.5, end: 1 },
          { word: 'sat', start: 1, end: 2 },
        ],
        segments: [{ start: 0, end: 3, avg_logprob: -0.1, no_speech_prob: 0.01 }],
      });
    });
    const result = await transcribeReading(
      new Blob(['a'.repeat(200)], { type: 'audio/webm' }),
      'The dog sat.',
      transport,
    );
    expect(result).toMatchObject({
      completed: true,
      wordsRight: 3,
      wordsTotal: 3,
      seconds: 3,
      wordsPerMinute: 60,
    });
    expect(transport.mock.calls[0]![0]).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
  });
  it('fails visibly for silence and invalid provider shapes without leaking raw errors', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    const audio = new Blob(['a'.repeat(200)], { type: 'audio/webm' });
    await expect(
      transcribeReading(audio, 'Hello.', async () =>
        Response.json({ duration: 3, words: [], segments: [] }),
      ),
    ).rejects.toThrow('no_speech');
    await expect(
      transcribeReading(audio, 'Hello.', async () => Response.json({ private: 'secret' })),
    ).rejects.toThrow('speech_invalid');
    await expect(
      transcribeReading(
        audio,
        'Hello.',
        async () => new Response('private provider error', { status: 429 }),
      ),
    ).rejects.toThrow('speech_busy');
  });
});
