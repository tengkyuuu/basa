'use client';
import { PronunciationFeedback } from './pronunciation-feedback';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { ReadingHelp } from '@basabridge/contracts';
import type { ReadingHelp as HelpSettings } from '@basabridge/contracts';
import type { Progress, Snapshot } from '@/lib/domain';
import { catalog, translate } from '@/lib/i18n';
import type { Language, MessageKey } from '@/lib/i18n';
import { BrandLogo } from './brand-logo';
import { SpeechReader } from './speech-reader';
import {
  LearningView,
  PlacementIntro,
  PlacementResult,
  GuardianPanel,
  DecisionList,
} from './learning-view';
import { SpeakButton } from './spoken-text';
import { SUPPORT_RULE } from '@basabridge/levels';

type View = 'home' | 'learn' | 'progress' | 'account' | 'help' | 'reading';
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
function Icon({
  name,
  size = 24,
}: {
  name: 'book' | 'arrow' | 'check' | 'help' | 'bridge';
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'book' && (
        <>
          <path d="M3 4h5a4 4 0 0 1 4 4v13a5 5 0 0 0-4-2H3z" />
          <path d="M21 4h-5a4 4 0 0 0-4 4v13a5 5 0 0 1 4-2h5z" />
        </>
      )}
      {name === 'arrow' && <path d="M4 12h15M13 6l6 6-6 6" />}
      {name === 'check' && <path d="m5 12 4 4L19 6" />}
      {name === 'help' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.8c-1 .6-1.8 1.2-1.8 2.7M12 17h.01" />
        </>
      )}
      {name === 'bridge' && <path d="M2 19h20M4 19C4 7 20 7 20 19M8 19v-6M12 19V9M16 19v-6" />}
    </svg>
  );
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function errorKey(error: unknown): MessageKey {
  return error instanceof Error && error.message in catalog
    ? (error.message as MessageKey)
    : 'unavailable';
}

export function ReadingApp() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [view, setView] = useState<View>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [simple, setSimple] = useState(false);
  const [busy, setBusy] = useState('');
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [chosen, setChosen] = useState<number[]>([]);
  const [linkCode, setLinkCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [rulerIndex, setRulerIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const t: Translator = (key, values) => translate(key, language, simple, values);
  const learner = snapshot?.learner;
  const session = learner?.session;

  function accept(data: Snapshot) {
    if (data.account?.id !== snapshot?.account?.id) {
      setLinkCode('');
      setRecoveryCode('');
    }
    setSnapshot(data);
    if (data.learner) {
      setLanguage(data.learner.settings.language);
      setSimple(data.learner.settings.simpleWords);
    }
  }
  async function refresh() {
    setBusy('refresh');
    setError(null);
    try {
      const res = await fetch('/api/app', {
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      accept(data);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy('');
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (busy !== 'start' && learner?.generation?.status !== 'running') return;
    let alive = true;
    const interval = setInterval(() => {
      void fetch('/api/app', { cache: 'no-store', signal: AbortSignal.timeout(10000) })
        .then(async (response) => {
          if (response.ok) {
            const snapshot = await response.json();
            if (alive) accept(snapshot);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [busy, learner?.generation?.status]);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (snapshot) heading.current?.focus({ preventScroll: true });
  }, [view, session?.phase, session?.questionIndex, snapshot?.account?.id]);
  useEffect(() => {
    if (error) errorBox.current?.focus();
  }, [error]);
  useEffect(() => {
    const change = () => {
      const next = window.location.hash.slice(1);
      if (['home', 'learn', 'progress', 'account', 'help', 'reading'].includes(next))
        setView(next as View);
    };
    change();
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  function go(next: View) {
    setView(next);
    window.location.hash = next;
    setError(null);
    setNotice(null);
    setChosen([]);
  }
  async function act(body: Record<string, unknown>): Promise<boolean> {
    setBusy(String(body.action));
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(body.action === 'start' ? 260_000 : 60_000),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'signed_out') {
          setSnapshot({ account: null, aiConfigured: false });
          setAuthMode('login');
          setLinkCode('');
          setRecoveryCode('');
        }
        throw new Error(data.error);
      }
      if (data.export) {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = 'basabridge-data.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        accept(data);
        if (data.code) setLinkCode(data.code);
        if (data.recoveryCode) setRecoveryCode(data.recoveryCode);
      }
      return true;
    } catch (e) {
      setError(errorKey(e));
      return false;
    } finally {
      setBusy('');
    }
  }
  async function auth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await act({
      action: authMode,
      username: form.get('username'),
      password: form.get('password'),
      ...(authMode === 'recover' ? { code: form.get('code') } : {}),
      ...(authMode === 'register'
        ? { role, ageBand: role === 'parent' ? 'adult' : form.get('ageBand') }
        : {}),
    });
    if (ok) {
      setLinkCode('');
      go('home');
    }
  }
  async function start(source: 'groq' | 'walkthrough' | 'reviewed') {
    if (await act({ action: 'start', source, requestId: crypto.randomUUID() })) {
      setRulerIndex(0);
      go('reading');
    }
  }
  function mainTitle(text: string, lang?: Language) {
    return (
      <h1 ref={heading} tabIndex={-1} lang={lang}>
        {text}
      </h1>
    );
  }
  function readingActions() {
    if (session && session.phase !== 'done')
      return (
        <button className="primary" disabled={!!busy} onClick={() => go('reading')}>
          {t('resume')}
          <Icon name="arrow" />
        </button>
      );
    return (
      <div className="action-stack">
        <button
          className="primary"
          disabled={!!busy || !snapshot?.aiConfigured || learner?.generation?.status === 'running'}
          onClick={() => void start('groq')}
        >
          {busy === 'start' || learner?.generation?.status === 'running'
            ? t('making')
            : learner?.generation?.status === 'ready'
              ? t('generation_resume')
              : t('start')}
          <Icon name="arrow" />
        </button>
        {learner?.generation?.status === 'interrupted' && (
          <p className="message" role="status">
            {t('generation_interrupted')}
          </p>
        )}
        <button
          className="secondary"
          disabled={!!busy || learner?.generation?.status === 'running'}
          onClick={() => void start('walkthrough')}
        >
          {t('bank')}
        </button>
        {!!learner?.learning?.reviewedStoryCount && (
          <button className="secondary" disabled={!!busy} onClick={() => void start('reviewed')}>
            {t('reviewed_story')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`app ${learner?.settings.highContrast ? 'high-contrast' : ''}`}
      aria-busy={!!busy}
    >
      <a className="skip-link" href="#content">
        {t('skip')}
      </a>
      <header className="site-header">
        <a className="brand" href="#home" onClick={() => go('home')}>
          <BrandLogo label={t('brand')} />
        </a>
        {snapshot?.account ? (
          <nav aria-label={t('nav')}>
            {(snapshot.account.role === 'student'
              ? (['home', 'learn', 'progress', 'account'] as const)
              : (['home', 'account'] as const)
            ).map((item) => (
              <a
                href={`#${item}`}
                key={item}
                aria-current={
                  view === item || (item === 'home' && view === 'reading') ? 'page' : undefined
                }
                onClick={() => go(item)}
              >
                {t(item)}
              </a>
            ))}
            <button
              className="nav-button"
              disabled={!!busy}
              onClick={async () => {
                if (await act({ action: 'logout' })) {
                  setAuthMode('login');
                  setLinkCode('');
                  go('home');
                }
              }}
            >
              {t('sign_out')}
            </button>
          </nav>
        ) : (
          <div className="language-switch" aria-label={t('language')}>
            <button lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>
              {t('english')}
            </button>
            <button lang="fil" aria-pressed={language === 'fil'} onClick={() => setLanguage('fil')}>
              {t('filipino')}
            </button>
          </div>
        )}
      </header>
      <main id="content" className={snapshot?.account ? 'main' : 'main welcome-layout'}>
        {(error || notice || busy === 'start') && (
          <div className="messages">
            {error && (
              <div className="message error" role="alert" tabIndex={-1} ref={errorBox}>
                <p>{t(error)}</p>
                <button className="text-button" disabled={!!busy} onClick={() => void refresh()}>
                  {t('refresh')}
                </button>
              </div>
            )}
            {notice && (
              <p className="message success" role="status">
                {t(notice)}
              </p>
            )}
            {busy === 'start' && (
              <p className="message" role="status">
                <span className="spinner" />
                {t('making')}
              </p>
            )}
          </div>
        )}
        {!snapshot && (
          <section className="loading-state" role="status">
            {t('loading')}
          </section>
        )}
        {snapshot && !snapshot.account && (
          <>
            <section className="welcome-copy">
              {mainTitle(t('welcome'))}
              <p className="lead">{t('welcome_body')}</p>
              <div className="reading-symbol" aria-hidden="true">
                <Icon name="book" size={80} />
              </div>
              <p className="welcome-note">{t('tagline')}</p>
            </section>
            <section className="auth-panel panel">
              <div className="segmented" aria-label={t('account')}>
                <button
                  aria-pressed={authMode === 'login'}
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                  }}
                >
                  {t('sign_in')}
                </button>
                <button
                  aria-pressed={authMode === 'register'}
                  onClick={() => {
                    setAuthMode('register');
                    setError(null);
                  }}
                >
                  {t('sign_up')}
                </button>
              </div>
              <h2>
                {t(
                  authMode === 'recover'
                    ? 'recover_title'
                    : authMode === 'login'
                      ? 'sign_in'
                      : 'sign_up',
                )}
              </h2>
              <p className="muted">{t(authMode === 'recover' ? 'recover_body' : 'auth_intro')}</p>
              <form key={authMode} onSubmit={auth} className="form-stack">
                {authMode === 'register' && (
                  <Field label={t('role')}>
                    <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                      <option value="student">{t('student')}</option>
                      <option value="parent">{t('parent')}</option>
                    </select>
                  </Field>
                )}
                <Field
                  label={t('username')}
                  hint={authMode === 'register' ? t('username_hint') : undefined}
                >
                  <input
                    name="username"
                    autoComplete="username"
                    required
                    minLength={authMode === 'register' ? 3 : 1}
                    maxLength={24}
                    pattern={authMode === 'register' ? '[a-zA-Z][a-zA-Z0-9_]{2,23}' : undefined}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </Field>
                <Field
                  label={t(authMode === 'recover' ? 'new_password' : 'password')}
                  hint={authMode !== 'login' ? t('password_hint') : undefined}
                >
                  <input
                    name="password"
                    type="password"
                    autoComplete={authMode !== 'login' ? 'new-password' : 'current-password'}
                    minLength={authMode !== 'login' ? 10 : 1}
                    maxLength={128}
                    required
                  />
                </Field>
                {authMode === 'recover' && (
                  <Field label={t('recovery_code')}>
                    <input
                      name="code"
                      required
                      maxLength={100}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>
                )}
                {authMode === 'register' && role === 'student' && (
                  <Field label={t('age')}>
                    <select name="ageBand" defaultValue="under13">
                      <option value="under13">{t('under13')}</option>
                      <option value="13plus">{t('age13')}</option>
                    </select>
                  </Field>
                )}
                <button className="primary full" disabled={!!busy}>
                  {busy
                    ? t('working')
                    : t(
                        authMode === 'recover'
                          ? 'reset_password'
                          : authMode === 'login'
                            ? 'sign_in'
                            : 'sign_up',
                      )}
                  <Icon name="arrow" />
                </button>
              </form>
              {authMode === 'login' && (
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={() => {
                    setAuthMode('recover');
                    setError(null);
                  }}
                >
                  {t('forgot_password')}
                </button>
              )}
            </section>
          </>
        )}
        {snapshot?.account?.role === 'student' && learner && view === 'home' && (
          <>
            {learner.placement === 'pending' ? (
              <section className="focus-panel panel form-stack">
                <span className="section-icon">
                  <Icon name="book" size={32} />
                </span>
                {mainTitle(t('placement_title'))}
                {learner.learning && (
                  <PlacementIntro
                    learning={learner.learning}
                    t={t}
                    busy={!!busy}
                    act={act}
                    onRead={() => go('reading')}
                  />
                )}
                {!learner.learning?.placement.active && (
                  <button
                    className="secondary"
                    disabled={!!busy}
                    onClick={() => void act({ action: 'skip_placement' })}
                  >
                    {t('placement_skip')}
                    <Icon name="arrow" />
                  </button>
                )}
              </section>
            ) : (
              <div className="home-grid">
                <section className="home-intro">
                  {mainTitle(t('ready'))}
                  <p className="lead">{t('ready_body')}</p>
                  {readingActions()}
                  {!snapshot.aiConfigured && <p className="muted setup-note">{t('ai_missing')}</p>}
                  <div className="silent-caption">
                    <Icon name="book" />
                    <div>
                      <strong>{t('silent')}</strong>
                      <p>{t('silent_note')}</p>
                    </div>
                  </div>
                </section>
                <aside className="home-side">
                  <section className="level-panel">
                    <h2>{t('level', { level: learner.level })}</h2>
                    <p>
                      {t(
                        learner.placement === 'complete' ? 'placement_estimate_note' : 'level_note',
                      )}
                    </p>
                    <div className="rule" />
                    {learner.placement === 'complete' && learner.learning?.placement.result ? (
                      <p>
                        {t('starting_level', { level: learner.learning.placement.result.level })}
                      </p>
                    ) : (
                      <p>{t('placement_reminder')}</p>
                    )}
                    {learner.learning && (
                      <details>
                        <summary>{t('placement_begin')}</summary>
                        <PlacementIntro
                          learning={learner.learning}
                          t={t}
                          busy={!!busy}
                          act={act}
                          onRead={() => go('reading')}
                        />
                      </details>
                    )}
                  </section>
                  <a href="#help" className="help-link" onClick={() => go('help')}>
                    <Icon name="help" />
                    <span>{t('help')}</span>
                    <Icon name="arrow" />
                  </a>
                </aside>
                <section className="recent-section">
                  <h2>{t('recent')}</h2>
                  {learner.progress.history[0] ? (
                    <div className="recent-row">
                      <div>
                        <h3 lang="en">{learner.progress.history[0].title}</h3>
                        <p>
                          {t('score', {
                            correct: learner.progress.history[0].correct,
                            total: learner.progress.history[0].total,
                          })}
                        </p>
                      </div>
                      <a href="#progress" onClick={() => go('progress')}>
                        {t('progress')}
                        <Icon name="arrow" />
                      </a>
                    </div>
                  ) : (
                    <div className="empty-inline">
                      <Icon name="book" />
                      <div>
                        <strong>{t('no_activity')}</strong>
                        <p>{t('empty_body')}</p>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
        {snapshot?.account?.role === 'student' && learner && view === 'reading' && (
          <section
            className="reading-workspace"
            style={
              {
                '--reading-size':
                  learner.settings.textSize === 'large'
                    ? '1.65rem'
                    : learner.settings.textSize === 'small'
                      ? '1.15rem'
                      : '1.4rem',
                '--reading-leading': learner.settings.lineSpacing === 'wide' ? '2.1' : '1.75',
              } as CSSProperties
            }
          >
            {!session ? (
              <>
                {mainTitle(t('ready'))}
                <button className="primary" onClick={() => go('home')}>
                  {t('back_home')}
                </button>
              </>
            ) : (
              <>
                <ol className="reading-steps" aria-label={t('reading_steps')}>
                  {(['step_read', 'step_answer', 'step_results'] as const).map((step, index) => {
                    const current =
                      session.phase === 'reading' ? 0 : session.phase === 'done' ? 2 : 1;
                    return (
                      <li
                        key={step}
                        aria-current={index === current ? 'step' : undefined}
                        className={index < current ? 'complete' : undefined}
                      >
                        <span className="step-number" aria-hidden="true">
                          {index < current ? <Icon name="check" size={16} /> : index + 1}
                        </span>
                        {t(step)}
                      </li>
                    );
                  })}
                </ol>
                {!(session.source === 'placement' && learner.learning?.placement.result) && (
                  <div className="reading-meta">
                    <span className="tag">{t('level', { level: session.level })}</span>
                    <span>
                      {t(
                        session.source === 'groq'
                          ? 'generated'
                          : session.source === 'placement'
                            ? 'placement_passage'
                            : session.source === 'reviewed'
                              ? 'reviewed_source'
                              : 'authored',
                      )}
                    </span>
                  </div>
                )}
                {session.phase === 'reading' && (
                  <>
                    {mainTitle(session.title, 'en')}
                    <p className="lead">{t('read_instruction')}</p>
                    {learner.settings.audioInstructions && (
                      <SpeakButton
                        text={t('read_instruction')}
                        language={language}
                        t={t}
                        auto={session.level <= SUPPORT_RULE.autoInstructionsMaxLevel}
                        disabled={recordingBusy}
                      />
                    )}
                    {session.source !== 'placement' &&
                      session.level <= SUPPORT_RULE.listenBeforeReadMaxLevel &&
                      session.text && (
                        <div>
                          <p>{t('listen_before_read')}</p>
                          <SpeakButton
                            text={session.text}
                            language="en"
                            t={t}
                            disabled={!!busy || recordingBusy}
                            beforeSpeak={() =>
                              act({ action: 'support', id: session.id, support: 'supported_try' })
                            }
                          />
                        </div>
                      )}
                    <article
                      className={`story-paper ${learner.settings.readingRuler ? 'with-ruler' : ''}`}
                      lang="en"
                      aria-label={session.title}
                    >
                      {(session.text?.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((line, i) => (
                        <span
                          key={i}
                          className={
                            learner.settings.readingRuler && i === rulerIndex ? 'active-line' : ''
                          }
                        >
                          {line.trim()}{' '}
                        </span>
                      ))}
                    </article>
                    {learner.settings.readingRuler && (
                      <div className="ruler-controls">
                        <button
                          disabled={rulerIndex === 0}
                          onClick={() => setRulerIndex((i) => i - 1)}
                        >
                          {t('previous_sentence')}
                        </button>
                        <button
                          disabled={
                            rulerIndex >=
                            (session.text?.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.length ?? 1) - 1
                          }
                          onClick={() => setRulerIndex((i) => i + 1)}
                        >
                          {t('next_sentence')}
                        </button>
                      </div>
                    )}
                    <div className="reading-bottom">
                      <div>
                        <strong>{t('ready_questions')}</strong>
                        <p className="muted">{t('questions_hint')}</p>
                      </div>
                      <button
                        className="primary"
                        disabled={
                          !!busy ||
                          recordingBusy ||
                          session.voice.pending ||
                          !!session.voice.required
                        }
                        title={session.voice.required ? t('voice_required') : undefined}
                        onClick={() => void act({ action: 'begin', id: session.id })}
                      >
                        {t('answer_questions')}
                        <Icon name="arrow" />
                      </button>
                    </div>
                    <details
                      className="reading-voice"
                      open={
                        learner.microphoneConsent ||
                        session.voice.used > 0 ||
                        !!session.voice.required ||
                        undefined
                      }
                    >
                      <summary
                        onClick={(event) => {
                          if (recordingBusy) event.preventDefault();
                        }}
                      >
                        {t(session.voice.required ? 'read_aloud_required' : 'read_aloud_optional')}
                        <span>{t('read_aloud_hint')}</span>
                      </summary>
                      <SpeechReader
                        session={session}
                        under13={
                          snapshot.account.ageBand === 'under13' &&
                          !learner.learning?.guardian.approved
                        }
                        consent={learner.microphoneConsent}
                        configured={snapshot.speechConfigured ?? snapshot.aiConfigured}
                        provider={snapshot.speechProvider}
                        t={t}
                        onConsent={(value) => act({ action: 'microphone_consent', consent: value })}
                        onSnapshot={accept}
                        onBusy={setRecordingBusy}
                        onMisheard={(index, marked) =>
                          act({ action: 'misheard', id: session.id, index, marked })
                        }
                        onWordListen={(wordIndex) =>
                          act({ action: 'support', id: session.id, support: 'word_tap', wordIndex })
                        }
                      />
                    </details>
                  </>
                )}
                {session.phase === 'answering' && session.question && (
                  <>
                    <p className="question-progress">
                      {t('question_count', {
                        current: session.questionIndex + 1,
                        total: session.total,
                      })}
                    </p>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={t('questions_answered')}
                      aria-valuemin={0}
                      aria-valuemax={session.total}
                      aria-valuenow={session.questionIndex}
                    >
                      <span
                        style={{ width: `${(session.questionIndex / session.total) * 100}%` }}
                      />
                    </div>
                    <p className="muted">{t('story_hidden')}</p>
                    {mainTitle(session.question.question, 'en')}
                    {learner.settings.questionReadAloud && session.source !== 'placement' && (
                      <SpeakButton
                        text={[session.question.question, ...session.question.options].join('. ')}
                        language="en"
                        t={t}
                        disabled={!!busy}
                        beforeSpeak={() =>
                          act({ action: 'support', id: session.id, support: 'question_read_aloud' })
                        }
                      />
                    )}
                    <p id="answer-instruction">
                      {t(
                        session.question.type === 'choose_all'
                          ? 'choose_all'
                          : session.question.type === 'order_events'
                            ? 'order_events'
                            : 'choose_one',
                      )}
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await act({
                            action: 'answer',
                            id: session.id,
                            index: session.questionIndex,
                            chosen,
                          })
                        )
                          setChosen([]);
                      }}
                    >
                      <fieldset className="answers" aria-describedby="answer-instruction">
                        <legend className="sr-only" lang="en">
                          {session.question.question}
                        </legend>
                        {session.question.options.map((option, index) =>
                          session.question?.type === 'order_events' ? (
                            <button
                              type="button"
                              key={index}
                              className={`answer-option ${chosen.includes(index) ? 'selected' : ''}`}
                              aria-pressed={chosen.includes(index)}
                              disabled={!!busy || chosen.includes(index)}
                              onClick={() => setChosen([...chosen, index])}
                            >
                              <span className="option-marker">
                                {chosen.includes(index)
                                  ? chosen.indexOf(index) + 1
                                  : String.fromCharCode(65 + index)}
                              </span>
                              <span lang="en">{option}</span>
                            </button>
                          ) : (
                            <label
                              key={index}
                              className={`answer-option ${chosen.includes(index) ? 'selected' : ''}`}
                            >
                              <input
                                type={
                                  session.question?.type === 'choose_all' ? 'checkbox' : 'radio'
                                }
                                name="answer"
                                value={index}
                                checked={chosen.includes(index)}
                                disabled={!!busy}
                                onChange={() =>
                                  setChosen(
                                    session.question?.type === 'choose_all'
                                      ? chosen.includes(index)
                                        ? chosen.filter((i) => i !== index)
                                        : [...chosen, index]
                                      : [index],
                                  )
                                }
                              />
                              <span lang="en">{option}</span>
                              <span className="answer-check" aria-hidden="true">
                                {chosen.includes(index) && <Icon name="check" size={20} />}
                              </span>
                            </label>
                          ),
                        )}
                      </fieldset>
                      {session.question.type === 'order_events' && (
                        <button type="button" className="text-button" onClick={() => setChosen([])}>
                          {t('clear_order')}
                        </button>
                      )}
                      <button
                        className="primary answer-submit"
                        disabled={
                          !!busy ||
                          chosen.length === 0 ||
                          (session.question.type === 'order_events' &&
                            chosen.length !== session.question.options.length)
                        }
                      >
                        {t('check_answer')}
                        <Icon name="arrow" />
                      </button>
                    </form>
                  </>
                )}
                {session.phase === 'feedback' && session.feedback && (
                  <>
                    <p className="question-progress">
                      {t('question_count', {
                        current: session.questionIndex + 1,
                        total: session.total,
                      })}
                    </p>
                    {mainTitle(t(session.feedback.correct ? 'correct' : 'incorrect'))}
                    <div
                      className={`feedback-panel ${session.feedback.correct ? 'correct-panel' : ''}`}
                    >
                      <h2>{t('answer_label')}</h2>
                      <ul lang="en">
                        {session.feedback.correctOptions.map((option) => (
                          <li key={option}>{option}</li>
                        ))}
                      </ul>
                      <h2>{t('clue')}</h2>
                      <blockquote lang="en">{session.feedback.evidence}</blockquote>
                    </div>
                    <button
                      className="primary"
                      disabled={!!busy}
                      onClick={() =>
                        void act({ action: 'next', id: session.id, index: session.questionIndex })
                      }
                    >
                      {busy
                        ? t('working')
                        : t(session.questionIndex === session.total - 1 ? 'see_result' : 'next')}
                      <Icon name="arrow" />
                    </button>
                  </>
                )}
                {session.phase === 'done' && session.source === 'placement' && learner.learning && (
                  <PlacementResult
                    learning={learner.learning}
                    t={t}
                    busy={!!busy}
                    act={act}
                    onRead={() => go('reading')}
                    onHome={() => go('home')}
                  />
                )}
                {session.phase === 'done' && session.result && (
                  <>
                    {mainTitle(t('result_title'))}
                    <p className="lead" lang="en">
                      {session.title}
                    </p>
                    <section className="result-panel">
                      <h2>
                        {t('score', {
                          correct: session.result.correct,
                          total: session.result.total,
                        })}
                      </h2>
                      <div className="result-dots" aria-hidden="true">
                        {Array.from({ length: session.result.total }, (_, i) => (
                          <span key={i} className={i < session.result!.correct ? 'filled' : ''}>
                            {i < session.result!.correct && <Icon name="check" size={20} />}
                          </span>
                        ))}
                      </div>
                      <p>{t(session.voice.used > 0 ? 'voice_result_note' : 'no_voice_pass')}</p>
                      {session.result.levelAfter !== session.level && (
                        <p>{t('next_level', { level: session.result.levelAfter })}</p>
                      )}
                    </section>
                    {session.voice.latest?.pronunciation && (
                      <PronunciationFeedback
                        analysis={session.voice.latest}
                        context="saved"
                        t={t}
                        busy={!!busy}
                        onMisheard={(index, marked) =>
                          act({ action: 'misheard', id: session.id, index, marked })
                        }
                      />
                    )}
                    <section className="teacher-note">
                      <Icon name="book" />
                      <div>
                        <h2>{t('teacher')}</h2>
                        <p>
                          {session.result.note?.[language][simple ? 'simple' : 'standard'] ??
                            t('standard_note')}
                        </p>
                      </div>
                    </section>
                    <div className="button-row">
                      <button className="primary" onClick={() => go('home')}>
                        {t('another')}
                        <Icon name="arrow" />
                      </button>
                      <button className="secondary" onClick={() => go('progress')}>
                        {t('progress')}
                      </button>
                      {(session.result.correct < session.result.total ||
                        !!learner.learning?.flaggedWords.length) && (
                        <button className="text-button" onClick={() => go('learn')}>
                          {t('learn')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}
        {snapshot?.account?.role === 'student' && learner && view === 'progress' && (
          <section>
            {mainTitle(t('progress_title'))}
            <p className="lead">{t('score_hint')}</p>
            <ProgressView progress={learner.progress} t={t} language={language} />
            {learner.learning && (
              <DecisionList decisions={learner.learning.decisions} t={t} language={language} />
            )}
          </section>
        )}
        {snapshot?.account?.role === 'student' && learner?.learning && view === 'learn' && (
          <LearningView
            learning={learner.learning}
            t={t}
            language={language}
            simple={simple}
            busy={!!busy}
            act={act}
            onRead={() => go('home')}
            microphone={{
              under13:
                snapshot.account.ageBand === 'under13' && !learner.learning.guardian.approved,
              consent: learner.microphoneConsent,
              configured: snapshot.speechConfigured ?? snapshot.aiConfigured,
              provider: snapshot.speechProvider,
              onConsent: (consent) => act({ action: 'microphone_consent', consent }),
              onSnapshot: accept,
            }}
          />
        )}
        {snapshot?.account?.role === 'student' && learner && view === 'help' && (
          <section className="narrow">
            {mainTitle(t('help_title'))}
            <p className="lead">{t('help_body')}</p>
            <Settings
              key={JSON.stringify(learner.settings)}
              settings={learner.settings}
              t={t}
              disabled={!!busy}
              save={async (settings) => {
                if (await act({ action: 'settings', settings })) setNotice('saved');
              }}
            />
          </section>
        )}
        {snapshot?.account?.role === 'parent' && view !== 'account' && (
          <section>
            {mainTitle(t('parent_title'))}
            <p className="lead">{t('parent_body')}</p>
            <form
              className="link-form"
              onSubmit={(e) => {
                e.preventDefault();
                const code = new FormData(e.currentTarget).get('code');
                void act({ action: 'redeem', code });
              }}
            >
              <Field label={t('link_code')}>
                <input name="code" required maxLength={20} autoComplete="off" />
              </Field>
              <button className="primary" disabled={!!busy}>
                {t('link')}
                <Icon name="arrow" />
              </button>
            </form>
            {!snapshot.children?.length && (
              <div className="empty-state">
                <Icon name="book" size={40} />
                <p>{t('no_children')}</p>
              </div>
            )}
            {snapshot.children?.map((child) => (
              <section className="shared-learner" key={child.id}>
                <h2>{child.username}</h2>
                {child.level !== null && <p>{t('level', { level: child.level })}</p>}
                <GuardianPanel
                  provider={snapshot.speechProvider}
                  child={child}
                  t={t}
                  act={act}
                  busy={!!busy}
                />
                {child.progress ? (
                  <ProgressView progress={child.progress} t={t} language={language} />
                ) : (
                  <p className="message">{t('not_shared')}</p>
                )}
                {child.decisions && (
                  <DecisionList decisions={child.decisions} t={t} language={language} />
                )}
                {child.analysis && (
                  <details>
                    <summary>{t('details')}</summary>
                    {child.analysis.map((reading, i) => (
                      <div key={i}>
                        <h3 lang="en">{reading.title}</h3>
                        {reading.voice && (
                          <details>
                            <summary>{t('voice_words')}</summary>
                            <p>
                              {t('voice_counts', {
                                right: reading.voice.wordsRight,
                                total: reading.voice.wordsTotal,
                                pace: reading.voice.wordsPerMinute,
                              })}
                            </p>
                            {reading.voice.pronunciation && (
                              <PronunciationFeedback
                                analysis={reading.voice}
                                context="parent"
                                t={t}
                                busy={!!busy}
                                onMisheard={(index, marked) =>
                                  act({
                                    action: 'misheard',
                                    id: reading.id,
                                    index,
                                    marked,
                                    learnerId: child.id,
                                  })
                                }
                              />
                            )}
                            <ul className="word-results">
                              {reading.voice.words
                                .map((word, index) => ({ word, index }))
                                .filter(
                                  ({ word }) =>
                                    word.expected &&
                                    (word.outcome !== 'correct' || word.markedMisheard),
                                )
                                .slice(0, 20)
                                .map(({ word, index }) => (
                                  <li key={index}>
                                    <span lang="en">{word.expected}</span>
                                    {word.markedMisheard && <small>{t('marked_misheard')}</small>}
                                    <button
                                      className="text-button"
                                      disabled={!!busy}
                                      onClick={() =>
                                        void act({
                                          action: 'misheard',
                                          id: reading.id,
                                          index,
                                          marked: !word.markedMisheard,
                                          learnerId: child.id,
                                        })
                                      }
                                    >
                                      {t(word.markedMisheard ? 'undo_misheard' : 'mark_misheard')}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          </details>
                        )}
                        <p>{t('details_count', { count: reading.answers.length })}</p>
                        <ol className="shared-answers">
                          {reading.answers.map((answer) => (
                            <li key={answer.questionIndex}>
                              <p lang="en">{answer.question}</p>
                              <strong>{t(answer.correct ? 'answer_right' : 'answer_wrong')}</strong>
                              <p>
                                {t('answer_time', {
                                  seconds: Math.round(answer.responseMs / 1000),
                                })}
                              </p>
                              <small>
                                {t(answer.rushed ? 'reduced_evidence' : 'normal_evidence')}{' '}
                                {answer.accommodations.length
                                  ? answer.accommodations.map((a) => t(a)).join(', ')
                                  : t('no_support')}
                              </small>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </details>
                )}
              </section>
            ))}
          </section>
        )}
        {snapshot?.account && view === 'account' && (
          <section className="narrow">
            {mainTitle(t('account_title'))}
            <p className="lead">{snapshot.account.username}</p>
            {snapshot.account.role === 'student' && (
              <>
                <a className="help-link" href="#help" onClick={() => go('help')}>
                  <Icon name="help" />
                  <span>{t('help')}</span>
                  <Icon name="arrow" />
                </a>
                <section className="settings-section">
                  <h2>{t('sharing_title')}</h2>
                  <p>{t('sharing_body')}</p>
                  <button
                    className="secondary"
                    disabled={!!busy}
                    onClick={() => void act({ action: 'link_code' })}
                  >
                    {t('create_code')}
                  </button>
                  {linkCode && (
                    <div className="code-box" role="status">
                      <output>{linkCode}</output>
                      <p>{t('expires')}</p>
                    </div>
                  )}
                  {!snapshot.links?.length && <p className="muted">{t('no_links')}</p>}
                  {snapshot.links?.map((link) => (
                    <div className="parent-link" key={link.id}>
                      <h3>{link.username}</h3>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={link.progress}
                          disabled={!!busy}
                          onChange={(e) =>
                            void act({
                              action: 'sharing',
                              parentId: link.id,
                              progress: e.target.checked,
                              analysis: link.analysis,
                              revoke: false,
                            })
                          }
                        />
                        {t('share_progress')}
                      </label>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={link.analysis}
                          disabled={!!busy}
                          onChange={(e) =>
                            void act({
                              action: 'sharing',
                              parentId: link.id,
                              progress: link.progress,
                              analysis: e.target.checked,
                              revoke: false,
                            })
                          }
                        />
                        {t('share_analysis')}
                      </label>
                      <button
                        className="text-button danger-text"
                        disabled={!!busy}
                        onClick={() =>
                          void act({
                            action: 'sharing',
                            parentId: link.id,
                            progress: false,
                            analysis: false,
                            revoke: true,
                          })
                        }
                      >
                        {t('revoke')}
                      </button>
                    </div>
                  ))}
                </section>
              </>
            )}
            <section className="settings-section">
              <h2>{t('recovery_title')}</h2>
              <p>{t('recovery_body')}</p>
              <form
                className="form-stack"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  if (
                    await act({
                      action: 'recovery_code',
                      password: new FormData(form).get('password'),
                    })
                  )
                    form.reset();
                }}
              >
                <Field label={t('recovery_password')}>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                  />
                </Field>
                <button className="secondary" disabled={!!busy}>
                  {t('make_recovery_code')}
                </button>
              </form>
              {recoveryCode && (
                <div className="code-box" role="status">
                  <output className="recovery-code">{recoveryCode}</output>
                  <p>{t('recovery_save')}</p>
                </div>
              )}
            </section>
            <section className="settings-section">
              <h2>{t('data_title')}</h2>
              <button
                className="secondary"
                disabled={!!busy}
                onClick={() => void act({ action: 'export' })}
              >
                {t('export')}
              </button>
            </section>
            <details className="delete-section">
              <summary>{t('delete_title')}</summary>
              <p>{t('delete_body')}</p>
              <form
                className="form-stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const password = new FormData(e.currentTarget).get('password');
                  if (await act({ action: 'delete', password })) {
                    setAuthMode('login');
                    setLinkCode('');
                    go('home');
                  }
                }}
              >
                <Field label={t('password')}>
                  <input type="password" name="password" autoComplete="current-password" required />
                </Field>
                <button className="danger" disabled={!!busy}>
                  {t('delete')}
                </button>
              </form>
            </details>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span>{t('footer')}</span>
        <a href="/privacy">{t('privacy_title')}</a>
        {snapshot?.account?.role === 'student' && (
          <a href="#help" onClick={() => go('help')}>
            {t('help')}
          </a>
        )}
      </footer>
    </div>
  );
}

function ProgressView({
  progress,
  t,
  language,
}: {
  progress: Progress;
  t: Translator;
  language: Language;
}) {
  return (
    <>
      <dl className="stats">
        <div>
          <dt>{t('stories_finished')}</dt>
          <dd>{progress.completed}</dd>
        </div>
        <div>
          <dt>{t('questions_answered')}</dt>
          <dd>{progress.answered}</dd>
        </div>
        <div>
          <dt>{t('answers_correct')}</dt>
          <dd>{progress.correct}</dd>
        </div>
      </dl>
      <section className="skill-section">
        <h2>{t('skill_title')}</h2>
        <div className="skills">
          {(['vocabulary', 'literal', 'inferential'] as const).map((skill) => (
            <div className="skill-row" key={skill}>
              <h3>{t(skill)}</h3>
              <p>{t(progress.skills[skill].confidence)}</p>
              <span>{t('items', { count: progress.skills[skill].items })}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="history-section">
        <h2>{t('history')}</h2>
        {progress.history.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t('history_title')}</th>
                  <th>{t('history_score')}</th>
                  <th>{t('history_date')}</th>
                </tr>
              </thead>
              <tbody>
                {progress.history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong lang="en">{item.title}</strong>
                      <small>{t('level', { level: item.level })}</small>
                    </td>
                    <td>{t('score', { correct: item.correct, total: item.total })}</td>
                    <td>
                      {new Intl.DateTimeFormat(language === 'fil' ? 'fil-PH' : 'en-PH', {
                        dateStyle: 'medium',
                        timeZone: 'Asia/Manila',
                      }).format(new Date(item.at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <Icon name="book" />
            <div>
              <strong>{t('no_activity')}</strong>
              <p>{t('empty_body')}</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
function Settings({
  settings,
  t,
  disabled,
  save,
}: {
  settings: HelpSettings;
  t: Translator;
  disabled: boolean;
  save: (value: HelpSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save(ReadingHelp.parse(draft));
      }}
    >
      <Field label={t('language')}>
        <select
          value={draft.language}
          onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}
        >
          <option value="en">{t('english')}</option>
          <option value="fil">{t('filipino')}</option>
        </select>
      </Field>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.simpleWords}
          onChange={(e) => setDraft({ ...draft, simpleWords: e.target.checked })}
        />
        {t('simple')}
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.audioInstructions}
          onChange={(e) => setDraft({ ...draft, audioInstructions: e.target.checked })}
        />
        {t('spoken_instructions')}
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.questionReadAloud}
          onChange={(e) => setDraft({ ...draft, questionReadAloud: e.target.checked })}
        />
        {t('spoken_questions')}
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.highContrast ?? false}
          onChange={(e) => setDraft({ ...draft, highContrast: e.target.checked })}
        />
        {t('high_contrast')}
      </label>
      <Field label={t('text_size')}>
        <select
          value={draft.textSize}
          onChange={(e) =>
            setDraft({ ...draft, textSize: e.target.value as HelpSettings['textSize'] })
          }
        >
          {(['small', 'medium', 'large'] as const).map((size) => (
            <option value={size} key={size}>
              {t(size)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('spacing')}>
        <select
          value={draft.lineSpacing}
          onChange={(e) =>
            setDraft({ ...draft, lineSpacing: e.target.value as HelpSettings['lineSpacing'] })
          }
        >
          <option value="normal">{t('normal')}</option>
          <option value="wide">{t('wide')}</option>
        </select>
      </Field>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.readingRuler}
          onChange={(e) => setDraft({ ...draft, readingRuler: e.target.checked })}
        />
        <span>
          {t('ruler')}
          <small>{t('ruler_body')}</small>
        </span>
      </label>
      <div
        className="settings-preview"
        style={{
          fontSize:
            draft.textSize === 'large'
              ? '1.65rem'
              : draft.textSize === 'small'
                ? '1.15rem'
                : '1.4rem',
          lineHeight: draft.lineSpacing === 'wide' ? 2.1 : 1.75,
        }}
      >
        {translate('preview', draft.language, draft.simpleWords)}
      </div>
      <button className="primary" disabled={disabled}>
        {t('save')}
        <Icon name="check" />
      </button>
    </form>
  );
}
