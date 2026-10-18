import { afterEach, describe, expect, it, vi } from 'vitest';
import { deployment, requestAllowed } from './deployment';

afterEach(() => vi.unstubAllEnvs());
const request = (host: string, origin: string) =>
  new Request('http://localhost/api/app', { headers: { host, origin } });
describe('trusted deployment origin', () => {
  it('trusts the Vercel-provided hostname while rejecting forged hosts and cross-origin requests', () => {
    vi.stubEnv('APP_ORIGIN', '');
    vi.stubEnv('RENDER_EXTERNAL_URL', '');
    vi.stubEnv('VERCEL_URL', 'reading-deployment.vercel.app');
    expect(deployment()).toEqual({ origin: 'https://reading-deployment.vercel.app', secure: true });
    expect(
      requestAllowed(
        request('reading-deployment.vercel.app', 'https://reading-deployment.vercel.app'),
        true,
      ),
    ).toBe(true);
    expect(
      requestAllowed(request('evil.test', 'https://reading-deployment.vercel.app'), true),
    ).toBe(false);
    expect(
      requestAllowed(request('reading-deployment.vercel.app', 'https://evil.test'), true),
    ).toBe(false);
  });
  it('allows loopback by default and rejects an attacker origin or host', () => {
    vi.stubEnv('APP_ORIGIN', '');
    expect(requestAllowed(request('127.0.0.1:3000', 'http://127.0.0.1:3000'), true)).toBe(true);
    expect(requestAllowed(request('127.0.0.1:3000', 'https://evil.test'), true)).toBe(false);
    expect(requestAllowed(request('evil.test', 'https://evil.test'), true)).toBe(false);
  });
  it('binds a public deployment to its exact HTTPS origin without trusting forwarded values', () => {
    vi.stubEnv('APP_ORIGIN', 'https://reading.example');
    expect(deployment().secure).toBe(true);
    expect(requestAllowed(request('reading.example', 'https://reading.example'), true)).toBe(true);
    expect(requestAllowed(request('reading.example', 'http://reading.example'), true)).toBe(false);
    expect(requestAllowed(request('evil.test', 'https://reading.example'), true)).toBe(false);
  });
  it('refuses insecure or ambiguous public configuration', () => {
    for (const origin of [
      'http://reading.example',
      'https://reading.example/',
      'https://user:pass@reading.example',
    ]) {
      vi.stubEnv('APP_ORIGIN', origin);
      expect(() => deployment()).toThrow();
    }
  });
});
