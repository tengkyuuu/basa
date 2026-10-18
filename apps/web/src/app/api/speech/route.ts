import { cookies } from 'next/headers';
import { z } from 'zod';
import { SPEECH_LIMITS } from '@basabridge/speech/limits';
import { SpeechError } from '@basabridge/speech';
import { service, ServiceError } from '@/server/service';
import { requestAllowed } from '@/server/deployment';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  try {
    if (!requestAllowed(request, true)) throw new ServiceError('forbidden', 403);
    const id = z.string().uuid().parse(request.headers.get('x-reading-session'));
    const requestId = z.string().uuid().parse(request.headers.get('x-recording-id'));
    const token = (await cookies()).get('bb_session')?.value;
    const app = await service();
    const word = request.headers.get('x-practice-word');
    if (word) {
      z.string()
        .regex(/^[A-Za-z]+(?:'[A-Za-z]+)?$/)
        .max(100)
        .parse(word);
      await app.wordGate(token, id, word);
    } else await app.speechGate(token, id); // Reject missing consent/under-13 before reading or forwarding audio.
    const type = request.headers.get('content-type')?.split(';')[0] ?? '';
    if (!['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'].includes(type))
      throw new ServiceError('speech_invalid', 415);
    if (Number(request.headers.get('content-length') ?? 0) > SPEECH_LIMITS.maxBytes)
      throw new ServiceError('speech_invalid', 413);
    const reader = request.body?.getReader();
    if (!reader) throw new ServiceError('speech_invalid');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > SPEECH_LIMITS.maxBytes) {
        await reader.cancel();
        throw new ServiceError('speech_invalid', 413);
      }
      chunks.push(value);
    }
    const audio = new Blob([Buffer.concat(chunks)], { type });
    if (audio.size < 100) throw new ServiceError('speech_invalid');
    if (word) await app.analyseWord(token, id, requestId, word, audio);
    else await app.analyseSpeech(token, id, requestId, audio);
    return reply(await app.snapshot(token));
  } catch (error) {
    if (error instanceof ServiceError) return reply({ error: error.code }, error.status);
    if (error instanceof SpeechError) return reply({ error: error.code }, 503);
    if (error instanceof z.ZodError) return reply({ error: 'invalid_request' }, 400);
    return reply({ error: 'speech_unavailable' }, 503);
  }
}
