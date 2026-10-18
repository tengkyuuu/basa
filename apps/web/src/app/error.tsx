'use client';

import { translate } from '@/lib/i18n';

export default function ErrorPage() {
  const language =
    typeof document !== 'undefined' && document.documentElement.lang === 'fil' ? 'fil' : 'en';
  return (
    <main className="main narrow" role="alert">
      <h1>{translate('crash_title', language)}</h1>
      <p>{translate('crash_body', language)}</p>
      <button className="primary" onClick={() => window.location.reload()}>
        {translate('reload', language)}
      </button>
    </main>
  );
}
