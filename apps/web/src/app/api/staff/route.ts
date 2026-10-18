import { cookies } from 'next/headers';
import { z } from 'zod';
import { service, ServiceError } from '@/server/service';
import { deployment, requestAllowed, clientBucket } from '@/server/deployment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const password = z.string().min(14).max(128);
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('login'),
    username: z.string().min(3).max(24),
    password: z.string().min(1).max(128),
  }),
  z.object({
    action: z.literal('enroll'),
    code: z.string().min(32).max(256),
    username: z.string().regex(/^[a-z][a-z0-9_]{2,23}$/),
    password,
  }),
  z.object({ action: z.literal('invite'), role: z.enum(['admin', 'content', 'guardian']) }),
  z.object({ action: z.literal('disable'), id: z.string().uuid() }),
  z.object({ action: z.literal('password'), previous: z.string().max(128), password }),
  z.object({ action: z.literal('logout') }),
]);
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function handle(request: Request, mutation: boolean) {
  try {
    if (!requestAllowed(request, mutation)) throw new ServiceError('forbidden', 403);
    const app = await service();
    const jar = await cookies();
    let token = jar.get('bb_staff')?.value;
    let extra: Record<string, unknown> = {};
    if (mutation) {
      await app.rateLimit(`staff:requests:${clientBucket(request)}`, 40, 60000);
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
        if (size > 4096) {
          await reader.cancel();
          throw new ServiceError('invalid_request', 413);
        }
        chunks.push(value);
      }
      const input = schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (input.action === 'login' || input.action === 'enroll') {
        await app.rateLimit('staff:authentication', 40, 15 * 60000);
        await app.rateLimit(`staff:login:${input.username.toLowerCase()}`, 8, 15 * 60000);
        token =
          input.action === 'enroll'
            ? await app.staff.enroll(input.code, input.username, input.password)
            : await app.staff.login(input.username, input.password);
        jar.set('bb_staff', token, {
          httpOnly: true,
          sameSite: 'strict',
          secure: deployment().secure,
          path: '/',
          maxAge: 8 * 3600,
        });
      } else if (input.action === 'invite')
        extra = { invite: await app.staff.invite(token, input.role) };
      else if (input.action === 'disable') await app.staff.disable(token, input.id);
      else if (input.action === 'password') {
        await app.staff.changePassword(token, input.previous, input.password);
        jar.delete('bb_staff');
        token = undefined;
      } else {
        await app.staff.logout(token);
        jar.delete('bb_staff');
        token = undefined;
      }
    }
    return reply({ ...(await app.staff.status(token)), ...extra });
  } catch (error) {
    if (error instanceof ServiceError) return reply({ error: error.code }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return reply({ error: 'invalid_request' }, 400);
    return reply({ error: 'unavailable' }, 503);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
