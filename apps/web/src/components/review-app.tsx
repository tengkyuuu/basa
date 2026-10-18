'use client';
import { useEffect, useRef, useState } from 'react';
import { catalog, translate, lessonText, type Language, type MessageKey } from '@/lib/i18n';
import { BrandLogo } from './brand-logo';
import { StaffGate } from './staff-gate';
import type { LearningWorkflows } from '@/server/learning';
type ReviewData = Awaited<ReturnType<LearningWorkflows['reviews']>>;
export function ReviewApp() {
  const [language, setLanguage] = useState<Language>('en');
  const [simple, setSimple] = useState(false);
  const [data, setData] = useState<ReviewData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [notice, setNotice] = useState(false);
  const [reviewer, setReviewer] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(key, language, simple, values);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (selected) document.getElementById('review-material-heading')?.focus();
    else heading.current?.focus();
  }, [selected]);
  async function load(body?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNotice(false);
    try {
      const response = await fetch('/api/review', {
        method: body ? 'POST' : 'GET',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(30000),
      });
      const next = await response.json();
      if (!response.ok) {
        setError(next.error in catalog ? next.error : 'unavailable');
        if (response.status === 403 || response.status === 401) setData(null);
        return false;
      }
      setData(next);
      if (body) setNotice(true);
      return true;
    } catch {
      setError('unavailable');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const material = data?.content.find((item) => item.id === selected);
  const filtered = (data?.content ?? []).filter((item) => {
    const title =
      'story' in item.value
        ? item.value.story.title
        : item.value.copy.title[language][simple ? 'simple' : 'standard'];
    return `${item.id} ${title}`.toLowerCase().includes(search.toLowerCase().trim());
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
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
      <main className="main">
        <h1 ref={heading} tabIndex={-1}>
          {t('review_title')}
        </h1>
        <p className="lead">{t('review_intro')}</p>
        {error && (
          <p className="message error" role="alert">
            {t(error)}
          </p>
        )}
        {notice && (
          <p className="message success" role="status">
            {t('review_saved')}
          </p>
        )}
        <StaffGate
          t={t}
          onChange={(username) => {
            setReviewer(username ?? '');
            if (username) void load();
            else {
              setData(null);
              setSelected(null);
            }
          }}
        />
        {data && (
          <>
            <label className="check-row">
              <input
                type="checkbox"
                checked={simple}
                onChange={(e) => setSimple(e.target.checked)}
              />
              {t('simple')}
            </label>
            <section className="settings-section">
              <h2>{t('review_guardians')}</h2>
              {!data.guardians.length && <p>{t('review_no_guardians')}</p>}
              {data.guardians.map((g) => (
                <form
                  key={g.id}
                  className="review-request form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const values = new FormData(e.currentTarget);
                    await load({
                      action: 'guardian',
                      learnerId: g.learnerId,
                      requestId: g.id,
                      reviewer,
                      status: 'approved',
                      method: values.get('method'),
                      verified: values.get('verified') === 'on',
                    });
                  }}
                >
                  <p className="reference-code">{t('guardian_reference', { id: g.id })}</p>
                  <p>
                    {t(
                      g.version === 'azure-guardian-v1'
                        ? 'azure_guardian_notice'
                        : 'guardian_notice',
                    )}
                  </p>
                  <p>{t('guardian_manual')}</p>
                  <label className="field">
                    <span>{t('review_method')}</span>
                    <select name="method">
                      <option value="video_call">{t('video_call')}</option>
                      <option value="signed_form">{t('signed_form')}</option>
                    </select>
                  </label>
                  <label className="check-row">
                    <input name="verified" type="checkbox" required />
                    <span>{t('review_guardian_confirm')}</span>
                  </label>
                  <div className="button-row">
                    <button className="primary" disabled={busy || reviewer.trim().length < 2}>
                      {t('review_approve')}
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      disabled={busy || reviewer.trim().length < 2}
                      onClick={() =>
                        void load({
                          action: 'guardian',
                          learnerId: g.learnerId,
                          requestId: g.id,
                          reviewer,
                          status: 'rejected',
                          method: null,
                          verified: false,
                        })
                      }
                    >
                      {t('review_reject')}
                    </button>
                  </div>
                </form>
              ))}
            </section>
            {!material && (
              <section className="settings-section">
                <h2>{t('review_materials')}</h2>
                <label className="field narrow">
                  <span>{t('review_search')}</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                </label>
                {!filtered.length && <p role="status">{t('review_empty')}</p>}
                <ul className="lesson-list">
                  {filtered.slice(page * 8, (page + 1) * 8).map((item) => (
                    <li className="lesson-row" key={item.id}>
                      <div>
                        <h3>
                          {'story' in item.value
                            ? item.value.story.title
                            : item.value.copy.title[language][simple ? 'simple' : 'standard']}
                        </h3>
                        <p>
                          {item.review?.status === 'approved' ? t('approved') : t('review_draft')}
                        </p>
                        <small className="reference-code">{item.id}</small>
                      </div>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => setSelected(item.id)}
                      >
                        {t('review_open')}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="button-row">
                  <button
                    className="secondary"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    {t('review_previous')}
                  </button>
                  <p role="status">{t('review_page', { page: page + 1, total: pages })}</p>
                  <button
                    className="secondary"
                    disabled={page + 1 >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    {t('review_next')}
                  </button>
                </div>
              </section>
            )}
            {material && (
              <section className="settings-section review-material" key={material.id}>
                <button className="text-button" onClick={() => setSelected(null)}>
                  {t('review_back')}
                </button>
                <h2 id="review-material-heading" tabIndex={-1}>
                  {'story' in material.value
                    ? material.value.story.title
                    : material.value.copy.title[language][simple ? 'simple' : 'standard']}
                </h2>
                {!material.valid && <p className="message error">{t('review_invalid')}</p>}
                {'story' in material.value ? (
                  <>
                    <p>{t('level', { level: material.value.level })}</p>
                    <article className="practice-passage" lang="en">
                      {material.value.story.text}
                    </article>
                    <ol>
                      {material.value.story.questions.map((q, index) => (
                        <li key={index} className="review-question" lang="en">
                          <h3>{q.question}</h3>
                          <ol type="A">
                            {q.options.map((o, i) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ol>
                          <p>
                            <strong lang={language}>{t('review_answer')}: </strong>
                            {q.answerIndexes.map((i) => q.options[i]).join(', ')}
                          </p>
                          <blockquote>{q.evidence}</blockquote>
                          <p lang={language}>{lessonText(q.subskill, 'title', language, simple)}</p>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <>
                    {(['en', 'fil'] as const).map((lang) => (
                      <section key={lang} lang={lang}>
                        <h3>{t(lang === 'en' ? 'review_english' : 'review_filipino')}</h3>
                        {(['simple', 'standard'] as const).map((variant) => (
                          <div className="worked-example" key={variant}>
                            <p>
                              {material.value && 'copy' in material.value
                                ? material.value.copy.goal[lang][variant]
                                : ''}
                            </p>
                            <p>
                              {material.value && 'copy' in material.value
                                ? material.value.copy.explain[lang][variant]
                                : ''}
                            </p>
                            <p>
                              {material.value && 'copy' in material.value
                                ? material.value.copy.point[lang][variant]
                                : ''}
                            </p>
                          </div>
                        ))}
                      </section>
                    ))}
                    <ol>
                      {material.value.items.map((item) => (
                        <li key={item.id} className="review-question" lang="en">
                          <p>{item.passage}</p>
                          <h3>{item.question.question}</h3>
                          <ol type="A">
                            {item.question.options.map((o, i) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ol>
                          <p>
                            <strong>{t('review_answer')}: </strong>
                            {item.question.answerIndexes
                              .map((i) => item.question.options[i])
                              .join(', ')}
                          </p>
                          <blockquote>{item.question.evidence}</blockquote>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    if (
                      await load({
                        action: 'content',
                        id: material.id,
                        hash: material.hash,
                        reviewer,
                        status: 'approved',
                        confirmed: new FormData(form).get('confirmed') === 'on',
                      })
                    )
                      form.reset();
                  }}
                >
                  <label className="check-row">
                    <input
                      name="confirmed"
                      type="checkbox"
                      required
                      disabled={busy || !material.valid}
                    />
                    <span>{t('review_content_confirm')}</span>
                  </label>
                  <div className="button-row">
                    <button
                      className="primary"
                      disabled={busy || !material.valid || reviewer.trim().length < 2}
                    >
                      {t('review_approve')}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy || reviewer.trim().length < 2}
                      onClick={() =>
                        void load({
                          action: 'content',
                          id: material.id,
                          hash: material.hash,
                          reviewer,
                          status: 'retired',
                          confirmed: true,
                        })
                      }
                    >
                      {t('review_retire')}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
