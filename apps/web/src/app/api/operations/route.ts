import { cookies } from 'next/headers';
import { requestAllowed } from '@/server/deployment';
import { service, ServiceError } from '@/server/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (!requestAllowed(request, false)) throw new ServiceError('forbidden', 403);
    const app = await service();
    const data = await app.operations((await cookies()).get('bb_staff')?.value);
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json(
      { error: error instanceof ServiceError ? error.code : 'unavailable' },
      {
        status: error instanceof ServiceError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
