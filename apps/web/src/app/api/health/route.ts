import { service } from '@/server/service';
import { deployment } from '@/server/deployment';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    deployment();
    await (await service()).healthy();
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
