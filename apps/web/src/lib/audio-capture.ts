import { SPEECH_LIMITS } from '@basabridge/speech/limits';

export type AudioCapture = { stop: () => void; discard: () => void };

export function pcmWav(chunks: Int16Array[]): Blob {
  const count = chunks.reduce((n, c) => n + c.length, 0);
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const text = (at: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, count * 2, true);
  let offset = 44;
  for (const chunk of chunks)
    for (const sample of chunk) {
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Both transports keep audio in memory only. Discard never invokes onComplete. */
export async function captureAudio(
  media: MediaStream,
  provider: 'azure' | 'groq',
  onComplete: (audio: Blob) => void,
  onError: () => void,
): Promise<AudioCapture> {
  if (provider === 'groq') {
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    if (!mime) throw new Error('mic_unavailable');
    const recorder = new MediaRecorder(media, { mimeType: mime, audioBitsPerSecond: 32000 });
    const chunks: Blob[] = [];
    let bytes = 0;
    const discard = () => {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') recorder.stop();
      chunks.length = 0;
    };
    recorder.ondataavailable = (event) => {
      bytes += event.data.size;
      if (bytes > SPEECH_LIMITS.maxBytes) {
        discard();
        onError();
      } else if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      discard();
      onError();
    };
    recorder.onstop = () => {
      const audio = new Blob(chunks, { type: mime.split(';')[0] });
      chunks.length = 0;
      onComplete(audio);
    };
    recorder.start(1000);
    return {
      stop: () => {
        if (recorder.state !== 'inactive') recorder.stop();
      },
      discard,
    };
  }
  const context = new AudioContext({ sampleRate: 16000 });
  let source: MediaStreamAudioSourceNode | undefined;
  let node: AudioWorkletNode | undefined;
  let mute: GainNode | undefined;
  let active = true;
  const chunks: Int16Array[] = [];
  let samples = 0;
  const cleanup = () => {
    active = false;
    source?.disconnect();
    node?.disconnect();
    mute?.disconnect();
    if (node) {
      node.port.onmessage = null;
      node.onprocessorerror = null;
      node.port.close();
    }
    void context.close().catch(() => {});
  };
  try {
    if (context.sampleRate !== 16000) throw new Error('mic_unavailable');
    await context.audioWorklet.addModule('/reading-capture-worklet.js');
    source = context.createMediaStreamSource(media);
    node = new AudioWorkletNode(context, 'reading-capture');
    mute = context.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(context.destination);
    node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!active) return;
      const data = event.data.subarray(
        0,
        Math.max(0, 16000 * SPEECH_LIMITS.azureMaxSeconds - samples),
      );
      samples += data.length;
      if (44 + samples * 2 > SPEECH_LIMITS.maxBytes) {
        cleanup();
        chunks.length = 0;
        onError();
        return;
      }
      chunks.push(
        Int16Array.from(data, (n) =>
          Math.round(Math.max(-1, Math.min(1, n)) * (n < 0 ? 32768 : 32767)),
        ),
      );
    };
    node.onprocessorerror = () => {
      cleanup();
      chunks.length = 0;
      onError();
    };
    await context.resume();
    return {
      stop: () => {
        if (!active) return;
        cleanup();
        const audio = pcmWav(chunks);
        chunks.length = 0;
        onComplete(audio);
      },
      discard: () => {
        cleanup();
        chunks.length = 0;
      },
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
