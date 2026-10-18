import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openLocalDatabase } from '@basabridge/db/local';
import { sqliteRuntime, type RuntimeDatabase } from '@basabridge/db/runtime';
import { transcribeReading } from '@basabridge/speech';
import type * as SpeechModule from '@basabridge/speech';
import { triesFor } from '@basabridge/levels';
import { ReadingService } from './service';

vi.mock('@basabridge/speech', async (importOriginal) => ({
  ...(await importOriginal<typeof SpeechModule>()),
  transcribeReading: vi.fn(),
}));
let database: RuntimeDatabase;
let service: ReadingService;
const audio = new Blob(['a'.repeat(200)], { type: 'audio/webm' });
const analysis = {
  completed: true,
  lastWordIndex: 0,
  wordsTotal: 1,
  wordsRight: 1,
  seconds: 1,
  wordsPerMinute: 60,
  words: [
    {
      expected: 'story',
      heard: 'story',
      outcome: 'correct' as const,
      confidence: 0.9,
      markedMisheard: false,
    },
  ],
};
beforeEach(() => {
  vi.stubEnv('GROQ_API_KEY', 'test-key');
  database = sqliteRuntime(openLocalDatabase(':memory:'));
  service = new ReadingService(database);
  vi.mocked(transcribeReading).mockReset().mockResolvedValue(analysis);
});
afterEach(async () => {
  await database.close();
  vi.unstubAllEnvs();
});
async function account(ageBand: string) {
  const token = await service.register({
    username: 'speech_reader',
    password: 'test-password-42',
    role: 'student',
    ageBand,
  });
  await service.skipPlacement(token);
  await service.start(token, 'walkthrough');
  return { token, session: (await service.snapshot(token)).learner!.session! };
}
describe('server microphone enforcement', () => {
  it('practises only flagged words without consuming story tries or changing a level, and protects correction access', async () => {
    const { token, session } = await account('13plus');
    await service.microphoneConsent(token, true);
    vi.mocked(transcribeReading).mockResolvedValueOnce({
      ...analysis,
      wordsRight: 0,
      words: [{ ...analysis.words[0]!, expected: 'dog', heard: 'log', outcome: 'substitution' }],
    });
    await service.analyseSpeech(token, session.id, randomUUID(), audio);
    await service.beginQuestions(token, session.id);
    for (let i = 0; i < session.total; i++) {
      await service.answer(token, session.id, i, [0]);
      await service.next(token, session.id, i);
    }
    const level = (await service.snapshot(token)).learner!.level;
    expect((await service.snapshot(token)).learner!.learning!.flaggedWords).toContain('dog');
    await expect(service.wordGate(token, session.id, 'private-custom-text')).rejects.toThrow(
      'support_unavailable',
    );
    const id = randomUUID();
    await service.analyseWord(token, session.id, id, 'dog', audio);
    await service.analyseWord(token, session.id, id, 'dog', audio);
    expect(transcribeReading).toHaveBeenCalledTimes(2);
    expect(vi.mocked(transcribeReading).mock.calls[1]![1]).toBe('dog');
    const snapshot = (await service.snapshot(token)).learner!;
    expect(snapshot.level).toBe(level);
    expect(snapshot.session!.voice.used).toBe(1);
    expect(snapshot.learning!.wordPractice.attempts).toHaveLength(1);
    const parent = await service.register({
      username: 'word_parent',
      password: 'test-password-42',
      role: 'parent',
      ageBand: 'adult',
    });
    await service.redeem(parent, await service.newLinkCode(token));
    const learnerId = (await service.snapshot(token)).account!.id;
    await expect(service.markMisheard(parent, session.id, 0, true, learnerId)).rejects.toThrow(
      'forbidden',
    );
    await service.markMisheard(token, session.id, 0, true);
    const corrected = (await service.snapshot(token)).learner!;
    expect(corrected.session!.voice.latest!.words[0]!.markedMisheard).toBe(true);
    expect(corrected.session!.voice.latest!.wordsRight).toBe(0);
    expect(corrected.level).toBe(level);
  });
  it('denies under-13 and unconsented audio before contacting Groq', async () => {
    const { token, session } = await account('under13');
    await expect(service.microphoneConsent(token, true)).rejects.toMatchObject({
      code: 'guardian_required',
      status: 403,
    });
    await expect(service.analyseSpeech(token, session.id, randomUUID(), audio)).rejects.toThrow(
      'guardian_required',
    );
    expect(transcribeReading).not.toHaveBeenCalled();
  });
  it('records consent, counts actual attempts once, hides word evidence during questions and enforces the tier limit', async () => {
    const { token, session } = await account('13plus');
    await expect(service.analyseSpeech(token, session.id, randomUUID(), audio)).rejects.toThrow(
      'speech_consent_required',
    );
    await service.microphoneConsent(token, true);
    const first = randomUUID();
    await service.analyseSpeech(token, session.id, first, audio);
    await service.analyseSpeech(token, session.id, first, audio);
    expect(transcribeReading).toHaveBeenCalledTimes(1);
    for (let i = 1; i < triesFor(session.level)!; i++)
      await service.analyseSpeech(token, session.id, randomUUID(), audio);
    await expect(service.analyseSpeech(token, session.id, randomUUID(), audio)).rejects.toThrow(
      'tries_used',
    );
    await service.beginQuestions(token, session.id);
    expect((await service.snapshot(token)).learner!.session!.voice.latest).toBeNull();
    expect(JSON.stringify(await service.export(token))).not.toContain('wordsRight');
  });
  it('drops a pending result if consent is revoked during transcription', async () => {
    const { token, session } = await account('13plus');
    await service.microphoneConsent(token, true);
    let finish!: (value: typeof analysis) => void;
    const started = new Promise<void>((resolve) => {
      vi.mocked(transcribeReading).mockImplementation(() => {
        resolve();
        return new Promise((r) => {
          finish = r;
        });
      });
    });
    const pending = service.analyseSpeech(token, session.id, randomUUID(), audio);
    await started;
    await expect(service.beginQuestions(token, session.id)).rejects.toThrow('speech_busy');
    await service.microphoneConsent(token, false);
    finish(analysis);
    await expect(pending).rejects.toThrow('speech_consent_required');
    expect((await service.snapshot(token)).learner!.session!.voice.used).toBe(0);
  });
});
