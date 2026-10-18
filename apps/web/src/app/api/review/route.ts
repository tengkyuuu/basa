import { z } from 'zod';
import { requestAllowed } from '@/server/deployment';
import { service, ServiceError } from '@/server/service';
import { cookies } from 'next/headers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reviewer = z.string().trim().min(2).max(80).optional();
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('content'),
    id: z.string().max(100),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    reviewer,
    status: z.enum(['approved', 'retired']),
    confirmed: z.literal(true),
  }),
  z.object({
    action: z.literal('guardian'),
    learnerId: z.string().uuid(),
    requestId: z.string().uuid(),
    reviewer,
    status: z.enum(['approved', 'rejected']),
    method: z.enum(['video_call', 'signed_form']).nullable(),
    verified: z.boolean(),
  }),
]);
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function handle(request: Request, mutation: boolean) {
  try {
    if (!requestAllowed(request, mutation)) throw new ServiceError('forbidden', 403);
    const app = await service();
    const secret = await app.staff.principal((await cookies()).get('bb_staff')?.value);
    await app.rateLimit('review:requests', 60, 60000);
    // Authenticate before parsing any body or returning review data.
    const current = await app.learning.reviews(secret);
    if (!mutation) return reply(current);
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      throw new ServiceError('invalid_request', 415);
    const reader = request.body?.getReader();
    if (!reader) throw new ServiceError('invalid_request');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        await reader.cancel();
        throw new ServiceError('invalid_request', 413);
      }
      chunks.push(value);
    }
    const input = schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const identity = typeof secret === 'string' ? input.reviewer : `staff:${secret.id}`;
    if (!identity) throw new ServiceError('invalid_request');
    if (input.action === 'content')
      await app.learning.reviewContent(secret, { ...input, reviewer: identity });
    else await app.learning.reviewGuardian(secret, { ...input, reviewer: identity });
    return reply(await app.learning.reviews(secret));
  } catch (error) {
    if (error instanceof ServiceError) return reply({ error: error.code }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return reply({ error: 'invalid_request' }, 400);
    return reply({ error: 'unavailable' }, 503);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
