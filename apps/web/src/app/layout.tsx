import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { translate } from '@/lib/i18n';
import '@basabridge/ui/tokens.css';
import '@fontsource/lexend/500.css';
import '@fontsource/lexend/600.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: translate('brand'),
  description: translate('tagline'),
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
