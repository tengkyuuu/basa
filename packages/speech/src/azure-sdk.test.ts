import { afterEach, expect, it, vi } from 'vitest';
import { assessPronunciation } from './azure';
const mock = vi.hoisted(() => ({
  mode: 'success',
  close: vi.fn(),
  write: vi.fn(),
  telemetry: vi.fn(),
  apply: vi.fn(),
}));
vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechRecognizer: class {
    static enableTelemetry = mock.telemetry;
    recognized?: (s: unknown, e: unknown) => void;
    sessionStopped?: () => void;
    canceled?: (s: unknown, e: unknown) => void;
    startContinuousRecognitionAsync(start: () => void, fail: () => void) {
      if (mock.mode === 'fail') {
        fail();
        return;
      }
      start();
      if (mock.mode === 'timeout') return;
      queueMicrotask(() => {
        if (mock.mode === 'cancel') {
          this.canceled?.(null, { reason: 1 });
          return;
        }
        if (mock.mode !== 'empty')
          this.recognized?.(null, {
            result: {
              reason: 3,
              properties: {
                getProperty: () =>
                  mock.mode === 'invalid'
                    ? '{'
                    : JSON.stringify({
                        NBest: [
                          {
                            Confidence: 0.9,
                            PronunciationAssessment: { FluencyScore: 80 },
                            Words: [
                              {
                                Word: 'cat',
                                Offset: 0,
                                Duration: 5e6,
                                PronunciationAssessment: { AccuracyScore: 44 },
                                Phonemes: [],
                              },
                            ],
                          },
                        ],
                      }),
              },
            },
          });
        this.sessionStopped?.();
      });
    }
    close = mock.close;
  },
  SpeechConfig: { fromSubscription: () => ({}) },
  OutputFormat: { Detailed: 1 },
  AudioInputStream: { createPushStream: () => ({ write: mock.write, close: vi.fn() }) },
  AudioStreamFormat: { getWaveFormatPCM: vi.fn() },
  AudioConfig: { fromStreamInput: () => ({ close: vi.fn() }) },
  PronunciationAssessmentConfig: class {
    applyTo = mock.apply;
  },
  PronunciationAssessmentGradingSystem: { HundredMark: 1 },
  PronunciationAssessmentGranularity: { Phoneme: 1 },
  ResultReason: { RecognizedSpeech: 3 },
  CancellationReason: { EndOfStream: 3 },
  PropertyId: { SpeechServiceResponse_JsonResult: 1 },
}));
function audio() {
  const b = new ArrayBuffer(32044),
    v = new DataView(b);
  for (const [n, s] of [
    [0, 'RIFF'],
    [8, 'WAVE'],
    [12, 'fmt '],
    [36, 'data'],
  ] as const)
    [...s].forEach((c, i) => v.setUint8(n + i, c.charCodeAt(0)));
  for (const [n, value] of [
    [4, 32036],
    [16, 16],
    [24, 16000],
    [28, 32000],
    [40, 32000],
  ])
    v.setUint32(n!, value!, true);
  for (const [n, value] of [
    [20, 1],
    [22, 1],
    [32, 2],
    [34, 16],
  ])
    v.setUint16(n!, value!, true);
  return new Blob([b], { type: 'audio/wav' });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it.each(['success', 'empty', 'invalid', 'cancel', 'fail'])(
  'closes the SDK on %s without exposing diagnostics',
  async (mode) => {
    mock.mode = mode;
    vi.stubEnv('AZURE_SPEECH_KEY', 'private-test');
    vi.stubEnv('AZURE_SPEECH_REGION', 'southeastasia');
    if (mode === 'success') {
      const result = await assessPronunciation(audio(), 'cat');
      expect(result.pronunciation!.accuracy).toBe(44);
      expect(mock.write.mock.calls[0]![0].byteLength).toBe(32000);
    } else
      await expect(assessPronunciation(audio(), 'cat')).rejects.toThrow(
        mode === 'empty'
          ? 'no_speech'
          : mode === 'invalid'
            ? 'speech_invalid'
            : 'speech_unavailable',
      );
    expect(mock.close).toHaveBeenCalledOnce();
    expect(mock.telemetry).toHaveBeenCalledWith(false);
  },
);
it('closes the SDK when assessment times out', async () => {
  vi.useFakeTimers();
  mock.mode = 'timeout';
  vi.stubEnv('AZURE_SPEECH_KEY', 'private-test');
  vi.stubEnv('AZURE_SPEECH_REGION', 'southeastasia');
  const result = expect(assessPronunciation(audio(), 'cat')).rejects.toThrow('speech_unavailable');
  await vi.waitFor(() => expect(mock.write).toHaveBeenCalledOnce());
  await vi.advanceTimersByTimeAsync(200_001);
  await result;
  expect(mock.close).toHaveBeenCalledOnce();
});
