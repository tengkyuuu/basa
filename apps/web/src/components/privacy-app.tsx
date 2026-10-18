'use client';
import { useEffect, useState } from 'react';
import { translate, type Language } from '@/lib/i18n';
import { BrandLogo } from './brand-logo';
export function PrivacyApp() {
  const [language, setLanguage] = useState<Language>('en'),
    [simple, setSimple] = useState(false);
  const t = (key: Parameters<typeof translate>[0]) => translate(key, language, simple);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/">
          <BrandLogo label={t('brand')} />
        </a>
        <label className="field">
          <span>{t('language')}</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            <option value="en">{t('english')}</option>
            <option value="fil">{t('filipino')}</option>
          </select>
        </label>
      </header>
      <main className="main narrow">
        <h1>{t('privacy_title')}</h1>
        <label className="check-row">
          <input type="checkbox" checked={simple} onChange={(e) => setSimple(e.target.checked)} />
          {t('simple')}
        </label>
        {(
          [
            'privacy_accounts',
            'privacy_stories',
            'privacy_audio',
            'privacy_guardian',
            'privacy_sharing',
            'privacy_controls',
          ] as const
        ).map((key) => (
          <p key={key}>{t(key)}</p>
        ))}
        <p>
          <a href="https://console.groq.com/docs/your-data" rel="noreferrer">
            {t('privacy_groq')}
          </a>
        </p>
        <p>
          <a
            href="https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security"
            rel="noreferrer"
          >
            {t('privacy_azure')}
          </a>
        </p>
        <a href="/">{t('back_home')}</a>
      </main>
    </div>
  );
}
