import type { NextConfig } from 'next';

const config: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  outputFileTracingExcludes: { '/*': ['./.env*', './.local-data/**/*', '../../.local-data/**/*'] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), payment=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  // Workspace packages ship TypeScript source, so Next compiles them.
  transpilePackages: [
    '@basabridge/contracts',
    '@basabridge/db',
    '@basabridge/learn',
    '@basabridge/levels',
    '@basabridge/mastery',
    '@basabridge/speech',
    '@basabridge/story-ai',
    '@basabridge/teacher-ai',
    '@basabridge/ui',
  ],
};

export default config;
