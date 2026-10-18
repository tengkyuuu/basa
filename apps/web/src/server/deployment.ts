/** Runtime deployment policy. Never infer a trusted public origin from forwarded headers. */
export function deployment() {
  const configured = (
    process.env.APP_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  )?.trim();
  if (!configured) return { origin: null, secure: false };
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.origin !== configured || url.username || url.password)
    throw new Error('APP_ORIGIN must be an HTTPS origin without a path');
  return { origin: url.origin, secure: true };
}

export function requestAllowed(request: Request, mutation: boolean): boolean {
  const { origin } = deployment();
  const host = request.headers.get('host')?.toLowerCase() ?? '';
  const expected = origin ?? `http://${host}`;
  if (
    origin
      ? host !== new URL(origin).host
      : !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)
  )
    return false;
  if (mutation && request.headers.get('origin') !== expected) return false;
  return request.headers.get('sec-fetch-site') !== 'cross-site';
}

/** Only enable behind our reverse proxy, which replaces this header on every request. */
export function clientBucket(request: Request): string {
  return process.env.TRUST_PROXY === 'true'
    ? request.headers.get('x-bb-client-ip')?.slice(0, 64) || 'unknown'
    : 'direct';
}

export function positiveLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
