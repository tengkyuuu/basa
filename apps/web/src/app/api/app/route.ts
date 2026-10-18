import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ReadingHelp } from '@basabridge/contracts';
import { AIUnavailable, ServiceError, service } from '@/server/service';
import { clientBucket, deployment, requestAllowed } from '@/server/deployment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const COOKIE = 'bb_session';
const boundedPassword = z.string().min(10).max(128);
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('register'),
    username: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{2,23}$/),
    password: boundedPassword,
    role: z.enum(['student', 'parent']),
    ageBand: z.enum(['under13', '13plus', 'adult']),
  }),
  z.object({
    action: z.literal('login'),
    username: z.string().min(1).max(24),
    password: z.string().min(1).max(128),
  }),
  z.object({ action: z.literal('logout') }),
  z.object({ action: z.literal('recovery_code'), password: z.string().min(1).max(128) }),
  z.object({
    action: z.literal('recover'),
    username: z.string().min(1).max(24),
    code: z.string().min(1).max(100),
    password: boundedPassword,
  }),
  z.object({ action: z.literal('skip_placement') }),
  z.object({
    action: z.literal('placement_start'),
    grade: z.number().int().min(1).max(12).nullable(),
  }),
  z.object({ action: z.literal('placement_next') }),
  z.object({ action: z.literal('lesson_start'), id: z.string().max(100) }),
  z.object({
    action: z.literal('lesson_step'),
    id: z.string().max(100),
    index: z.number().int().min(0).max(20).nullable(),
    chosen: z.array(z.number().int().min(0).max(3)).min(1).max(4).nullable(),
  }),
  z.object({ action: z.literal('preset'), preset: z.enum(['standard', 'more']) }),
  z.object({
    action: z.literal('support'),
    id: z.string().uuid(),
    support: z.enum(['question_read_aloud', 'supported_try', 'word_tap']),
    wordIndex: z.number().int().min(0).max(1000).optional(),
  }),
  z.object({ action: z.literal('word_listen'), word: z.string().min(1).max(100) }),
  z.object({
    action: z.literal('misheard'),
    id: z.string().uuid(),
    index: z.number().int().min(0).max(1000),
    marked: z.boolean(),
    learnerId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal('guardian_request'),
    learnerId: z.string().uuid(),
    password: z.string().min(1).max(128),
    consent: z.literal(true),
  }),
  z.object({ action: z.literal('guardian_revoke'), learnerId: z.string().uuid() }),
  z.object({ action: z.literal('settings'), settings: ReadingHelp }),
  z.object({
    action: z.literal('start'),
    source: z.enum(['groq', 'walkthrough', 'reviewed']),
    requestId: z.string().uuid().optional(),
  }),
  z.object({ action: z.literal('begin'), id: z.string().uuid() }),
  z.object({
    action: z.literal('answer'),
    id: z.string().uuid(),
    index: z.number().int().min(0).max(20),
    chosen: z.array(z.number().int().min(0).max(3)).min(1).max(4),
  }),
  z.object({
    action: z.literal('next'),
    id: z.string().uuid(),
    index: z.number().int().min(0).max(20),
  }),
  z.object({ action: z.literal('link_code') }),
  z.object({ action: z.literal('redeem'), code: z.string().min(1).max(20) }),
  z.object({
    action: z.literal('sharing'),
    parentId: z.string().uuid(),
    progress: z.boolean(),
    analysis: z.boolean(),
    revoke: z.boolean(),
  }),
  z.object({ action: z.literal('export') }),
  z.object({ action: z.literal('delete'), password: z.string().min(1).max(128) }),
  z.object({ action: z.literal('microphone') }),
  z.object({ action: z.literal('microphone_consent'), consent: z.boolean() }),
]);
const response = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 429 ? { 'Retry-After': '60' } : {}),
    },
  });
function guard(request: Request, mutation: boolean) {
  if (!requestAllowed(request, mutation)) throw new ServiceError('forbidden', 403);
  if (mutation && !request.headers.get('content-type')?.startsWith('application/json'))
    throw new ServiceError('invalid_request');
}
function failure(error: unknown) {
  if (error instanceof ServiceError) return response({ error: error.code }, error.status);
  if (error instanceof AIUnavailable) return response({ error: error.code }, 503);
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return response({ error: 'invalid_request' }, 400);
  // Do not log exception details: database errors can include user data.
  return response({ error: 'unavailable' }, 500);
}
async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError('invalid_request');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new ServiceError('invalid_request', 413);
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function GET(request: Request) {
  try {
    guard(request, false);
    return response(await (await service()).snapshot((await cookies()).get(COOKIE)?.value));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    guard(request, true);
    const input = schema.parse(await readBody(request));
    const jar = await cookies();
    let token = jar.get(COOKIE)?.value;
    const app = await service();
    let extra: Record<string, unknown> = {};
    switch (input.action) {
      case 'register':
      case 'login':
      case 'recover': {
        await app.rateLimit(`authentication:client:${clientBucket(request)}`, 60, 15 * 60000);
        await app.rateLimit(`authentication:user:${input.username.toLowerCase()}`, 12, 15 * 60000);
        if (input.action === 'register' && input.role === 'parent' && input.ageBand !== 'adult')
          throw new ServiceError('invalid_request');
        token =
          input.action === 'register'
            ? await app.register(input)
            : input.action === 'recover'
              ? await app.recover(input.username, input.code, input.password)
              : await app.login(input.username, input.password);
        jar.set(COOKIE, token, {
          httpOnly: true,
          sameSite: 'strict',
          secure: deployment().secure,
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
        break;
      }
      case 'logout':
        await app.logout(token);
        jar.delete(COOKIE);
        token = undefined;
        break;
      case 'skip_placement':
        await app.skipPlacement(token);
        break;
      case 'placement_start':
        await app.learning.startPlacement(token, input.grade);
        break;
      case 'placement_next':
        await app.learning.nextPlacementStory(token);
        break;
      case 'lesson_start':
        await app.learning.startLesson(token, input.id);
        break;
      case 'lesson_step':
        await app.learning.lessonStep(token, input.id, input.index, input.chosen);
        break;
      case 'preset':
        await app.learning.applyPreset(token, input.preset);
        break;
      case 'support':
        await app.learning.recordSupport(token, input.id, input.support, input.wordIndex);
        break;
      case 'word_listen':
        await app.learning.listenPracticeWord(token, input.word);
        break;
      case 'misheard':
        await app.markMisheard(token, input.id, input.index, input.marked, input.learnerId);
        break;
      case 'guardian_request':
        await app.learning.requestGuardian(token, input.learnerId, input.password);
        break;
      case 'guardian_revoke':
        await app.learning.revokeGuardian(token, input.learnerId);
        break;
      case 'settings':
        await app.settings(token, input.settings);
        break;
      case 'start':
        await app.start(token, input.source, input.requestId);
        break;
      case 'begin':
        await app.beginQuestions(token, input.id);
        break;
      case 'answer':
        await app.answer(token, input.id, input.index, input.chosen);
        break;
      case 'next':
        await app.next(token, input.id, input.index);
        break;
      case 'link_code':
        extra = { code: await app.newLinkCode(token) };
        break;
      case 'recovery_code':
        extra = { recoveryCode: await app.recoveryCode(token, input.password) };
        break;
      case 'redeem':
        await app.redeem(token, input.code);
        break;
      case 'sharing':
        await app.sharing(token, input.parentId, input.progress, input.analysis, input.revoke);
        break;
      case 'export':
        return response({ export: await app.export(token) });
      case 'delete':
        await app.delete(token, input.password);
        jar.delete(COOKIE);
        token = undefined;
        break;
      case 'microphone':
        throw new ServiceError('voice_unavailable', 403);
      case 'microphone_consent':
        await app.microphoneConsent(token, input.consent);
        break;
    }
    return response({ ...(await app.snapshot(token)), ...extra });
  } catch (error) {
    return failure(error);
  }
}
