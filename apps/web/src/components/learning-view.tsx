'use client';
import { useEffect, useRef, useState } from 'react';
import { PLACEMENT_RULE } from '@basabridge/levels';
import type { LearningSnapshot, PublicLesson, Snapshot } from '@/lib/domain';
import { lessonText, catalog, type Language, type MessageKey } from '@/lib/i18n';
import type { DecisionRecord } from '@/lib/domain';
import { SpeakButton } from './spoken-text';
import { SpeechReader } from './speech-reader';
type Microphone = {
  under13: boolean;
  consent: boolean;
  configured: boolean;
  onSnapshot: (snapshot: Snapshot) => void;
  onConsent: (value: boolean) => Promise<boolean>;
};
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
type Action = (body: Record<string, unknown>) => Promise<boolean>;

export function PlacementIntro({
  learning,
  t,
  busy,
  act,
  onRead,
}: {
  learning: LearningSnapshot;
  t: Translator;
  busy: boolean;
  act: Action;
  onRead: () => void;
}) {
  const [grade, setGrade] = useState('');
  const p = learning.placement;
  return (
    <div className="form-stack">
      <p className="lead">{t('placement_intro')}</p>
      <p className="message">{t('placement_provisional')}</p>
      {p.active ? (
        <>
          <p>{t('placement_count', { count: p.count, maximum: p.maximum })}</p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (await act({ action: 'placement_next' })) onRead();
            }}
          >
            {t('placement_resume')}
          </button>
        </>
      ) : (
        <>
          <label className="field">
            <span>{t('grade_optional')}</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">{t('grade_unknown')}</option>
              {Object.keys(PLACEMENT_RULE.gradeStart).map((g) => (
                <option key={g} value={g}>
                  {t('grade_number', { grade: g })}
                </option>
              ))}
            </select>
          </label>
          {!p.ready && <p>{t('content_unavailable')}</p>}
          <button
            className="primary"
            disabled={busy || !p.canRetake || !p.ready}
            onClick={async () => {
              if (await act({ action: 'placement_start', grade: grade ? Number(grade) : null }))
                onRead();
            }}
          >
            {t(p.result ? 'placement_retake' : 'placement_begin')}
          </button>
          {!p.canRetake && <p>{t('placement_wait')}</p>}
        </>
      )}
    </div>
  );
}
export function PlacementResult({
  learning,
  t,
  busy,
  act,
  onRead,
  onHome,
}: {
  learning: LearningSnapshot;
  t: Translator;
  busy: boolean;
  act: Action;
  onRead: () => void;
  onHome: () => void;
}) {
  const p = learning.placement;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [p.count, p.result]);
  return (
    <div className="form-stack">
      <h1 ref={heading} tabIndex={-1}>
        {t(p.result ? 'placement_done' : 'placement_between')}
      </h1>
      <p>{t('placement_count', { count: p.count, maximum: p.maximum })}</p>
      {p.result ? (
        <>
          <h2>{t('starting_level', { level: p.result.level })}</h2>
          <p>{t('starting_confidence')}</p>
          <p className="message">{t('placement_provisional')}</p>
          {p.result.flags.includes('voice_missing') && <p>{t('voice_missing')}</p>}
          {p.result.flags.includes('low_decoding') && <p>{t('low_decoding')}</p>}
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void act({ action: 'preset', preset: p.result!.recommendedHelp })}
          >
            {t(p.result.recommendedHelp === 'more' ? 'more_help_preset' : 'standard_help_preset')}
          </button>
          <button className="primary" onClick={onHome}>
            {t('back_home')}
          </button>
        </>
      ) : (
        <>
          <p>{t('placement_intro')}</p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (await act({ action: 'placement_next' })) onRead();
            }}
          >
            {t('placement_next')}
          </button>
          <button className="text-button" onClick={onHome}>
            {t('back_home')}
          </button>
        </>
      )}
    </div>
  );
}
export function LearningView({
  learning,
  t,
  language,
  simple,
  busy,
  act,
  onRead,
  microphone,
}: {
  learning: LearningSnapshot;
  t: Translator;
  language: Language;
  simple: boolean;
  busy: boolean;
  act: Action;
  onRead: () => void;
  microphone: Microphone;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [hint, setHint] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const lesson = learning.lessons.find((l) => l.id === selected);
  useEffect(() => {
    setChosen([]);
    setHint(false);
    heading.current?.focus();
  }, [selected, lesson?.phase, lesson?.index]);
  async function open(item: PublicLesson) {
    if (await act({ action: 'lesson_start', id: item.id })) setSelected(item.id);
  }
  if (lesson && lesson.phase !== 'not_started')
    return (
      <section className="narrow lesson-workspace">
        <button className="text-button" onClick={() => setSelected(null)}>
          {t('lesson_back')}
        </button>
        <h1 ref={heading} tabIndex={-1}>
          {lessonText(lesson.subject, 'title', language, simple)}
        </h1>
        {lesson.phase === 'explain' && (
          <>
            <h2>{t('lesson_goal')}</h2>
            <p className="lead">{lessonText(lesson.subject, 'goal', language, simple)}</p>
            <p>{lessonText(lesson.subject, 'explain', language, simple)}</p>
            <SpeakButton
              text={lessonText(lesson.subject, 'explain', language, simple)}
              language={language}
              t={t}
            />
            {lesson.example && (
              <section className="worked-example">
                <h2>{t('lesson_example')}</h2>
                <p lang="en">{lesson.example.passage}</p>
                <p lang="en">{lesson.example.question}</p>
                <strong lang="en">{lesson.example.answer}</strong>
                <p>{lessonText(lesson.subject, 'point', language, simple)}</p>
              </section>
            )}
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void act({ action: 'lesson_step', id: lesson.id, index: null, chosen: null })
              }
            >
              {t('lesson_practice_start')}
            </button>
          </>
        )}
        {(lesson.phase === 'practice' || lesson.phase === 'check') && lesson.item && (
          <>
            <p>{t(lesson.phase === 'practice' ? 'lesson_practice' : 'lesson_check')}</p>
            <p>{t('lesson_item_count', { current: lesson.index + 1, total: lesson.total })}</p>
            <article className="practice-passage" lang="en">
              {lesson.item.passage}
            </article>
            <h2 lang="en">{lesson.item.question.question}</h2>
            {!lesson.feedback ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act({ action: 'lesson_step', id: lesson.id, index: lesson.index, chosen });
                }}
              >
                <fieldset className="answers">
                  <legend className="sr-only" lang="en">
                    {lesson.item.question.question}
                  </legend>
                  {lesson.item.question.options.map((option, index) => (
                    <label
                      key={index}
                      className={`answer-option ${chosen.includes(index) ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="practice-answer"
                        value={index}
                        checked={chosen.includes(index)}
                        disabled={busy}
                        onChange={() => setChosen([index])}
                      />
                      <span lang="en">{option}</span>
                    </label>
                  ))}
                </fieldset>
                {lesson.phase === 'practice' && (
                  <>
                    <button type="button" className="text-button" onClick={() => setHint(true)}>
                      {t('lesson_hint')}
                    </button>
                    {hint && (
                      <p className="message">
                        {lessonText(lesson.subject, 'point', language, simple)}
                      </p>
                    )}
                  </>
                )}
                <button className="primary answer-submit" disabled={busy || !chosen.length}>
                  {t('check_answer')}
                </button>
              </form>
            ) : (
              <>
                <section className="feedback-panel" role="status">
                  <h3>{t(lesson.feedback.correct ? 'correct' : 'incorrect')}</h3>
                  <p lang="en">{lesson.feedback.correctOptions.join(', ')}</p>
                  <blockquote lang="en">{lesson.feedback.evidence}</blockquote>
                </section>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void act({
                      action: 'lesson_step',
                      id: lesson.id,
                      index: lesson.index,
                      chosen: null,
                    })
                  }
                >
                  {t('next')}
                </button>
              </>
            )}
          </>
        )}
        {lesson.phase === 'done' && (
          <>
            <h2>{t('lesson_complete')}</h2>
            <p className="lead">
              {t(lesson.learned ? 'lesson_learned' : 'lesson_pending_recheck')}
            </p>
            <p>{t('lesson_no_level')}</p>
            {lesson.recheckTotal > 0 && (
              <p>
                {t('lesson_recheck_progress', {
                  correct: lesson.recheckCorrect,
                  total: lesson.recheckTotal,
                })}
              </p>
            )}
            <button className="primary" onClick={onRead}>
              {t('back_home')}
            </button>
          </>
        )}
      </section>
    );
  const row = (item: PublicLesson) => (
    <li className="lesson-row" key={item.id}>
      <div>
        <h3>{lessonText(item.subject, 'title', language, simple)}</h3>
        <p>{lessonText(item.subject, 'goal', language, simple)}</p>
        {item.reviewDue && <p>{t('lesson_review_due')}</p>}
        {!item.reviewDue && item.nextReviewAt && (
          <small>
            {t('lesson_review_date', {
              date: new Date(item.nextReviewAt).toLocaleDateString(
                language === 'fil' ? 'fil-PH' : 'en-PH',
              ),
            })}
          </small>
        )}
        {item.phase === 'done' && (
          <small>{t(item.learned ? 'lesson_learned' : 'lesson_pending_recheck')}</small>
        )}
      </div>
      <button className="secondary" disabled={busy} onClick={() => void open(item)}>
        {t(item.phase === 'not_started' ? 'lesson_open' : 'lesson_continue')}
      </button>
    </li>
  );
  return (
    <section>
      <h1 ref={heading} tabIndex={-1}>
        {t('learn_title')}
      </h1>
      <p className="lead">{t('lessons_ready')}</p>
      {learning.recommendedIds.length > 0 && (
        <section className="settings-section">
          <h2>{t('recommended_lessons')}</h2>
          <ul className="lesson-list">
            {learning.lessons.filter((l) => learning.recommendedIds.includes(l.id)).map(row)}
          </ul>
        </section>
      )}
      <section className="settings-section">
        <h2>{t('all_lessons')}</h2>
        {learning.lessons.length ? (
          <ul className="lesson-list">{learning.lessons.map(row)}</ul>
        ) : (
          <p className="message">{t('content_unavailable')}</p>
        )}
      </section>
      <section className="settings-section">
        <h2>{t('tricky_words')}</h2>
        <WordPractice learning={learning} t={t} act={act} busy={busy} microphone={microphone} />
      </section>
      <p>{t('lesson_no_level')}</p>
    </section>
  );
}
function WordPractice({
  learning,
  t,
  act,
  busy,
  microphone,
}: {
  learning: LearningSnapshot;
  t: Translator;
  act: Action;
  busy: boolean;
  microphone: Microphone;
}) {
  const [word, setWord] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  if (!learning.flaggedWords.length) return <p>{t('no_tricky_words')}</p>;
  const attempts = learning.wordPractice.attempts.filter((a) => a.word === word);
  return (
    <>
      <ul className="word-list">
        {learning.flaggedWords.map((item) => (
          <li key={item}>
            <span lang="en">{item}</span>
            <SpeakButton
              text={item}
              language="en"
              t={t}
              disabled={busy || recording}
              beforeSpeak={() => act({ action: 'word_listen', word: item })}
            />
            <button
              className="text-button"
              disabled={busy || recording}
              onClick={() => setWord(item)}
            >
              {t('word_practice_open', { word: item })}
            </button>
          </li>
        ))}
      </ul>
      {word && learning.wordPractice.sessionId && (
        <>
          <h3 lang="en">{word}</h3>
          <SpeechReader
            key={word}
            session={{
              id: learning.wordPractice.sessionId,
              voice: {
                latest: attempts.at(-1)?.analysis ?? null,
                used: attempts.length,
                allowed: null,
                pending: false,
              },
            }}
            practiceWord={word}
            under13={microphone.under13}
            consent={microphone.consent}
            configured={microphone.configured}
            t={t}
            onConsent={microphone.onConsent}
            onSnapshot={microphone.onSnapshot}
            onBusy={setRecording}
          />
          <p>{t('lesson_no_level')}</p>
        </>
      )}
    </>
  );
}
export function GuardianPanel({
  child,
  t,
  act,
  busy,
}: {
  child: NonNullable<Snapshot['children']>[number];
  t: Translator;
  act: Action;
  busy: boolean;
}) {
  if (!child.guardian?.under13) return null;
  const status = child.guardian.status;
  return (
    <section className="settings-section">
      <h3>{t('guardian_title')}</h3>
      <p>{t(status === 'none' ? 'guardian_none' : status)}</p>
      {child.guardian.requestId && (
        <p className="reference-code">
          {t('guardian_reference', { id: child.guardian.requestId })}
        </p>
      )}
      {status === 'pending' || status === 'approved' ? (
        <>
          <p>{t(status === 'pending' ? 'guardian_manual' : 'guardian_notice')}</p>
          <button
            className="text-button danger-text"
            disabled={busy}
            onClick={() => void act({ action: 'guardian_revoke', learnerId: child.id })}
          >
            {t('guardian_withdraw')}
          </button>
        </>
      ) : (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const values = new FormData(form);
            if (
              await act({
                action: 'guardian_request',
                learnerId: child.id,
                password: values.get('password'),
                consent: values.get('consent') === 'on',
              })
            )
              form.reset();
          }}
        >
          <p>{t('guardian_notice')}</p>
          <p>{t('guardian_manual')}</p>
          <label className="check-row">
            <input type="checkbox" name="consent" required disabled={busy} />
            <span>{t('guardian_agree')}</span>
          </label>
          <label className="field">
            <span>{t('password')}</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
              disabled={busy}
            />
          </label>
          <button className="secondary" disabled={busy}>
            {t('guardian_request')}
          </button>
        </form>
      )}
    </section>
  );
}
export function DecisionList({
  decisions,
  t,
  language,
}: {
  decisions: DecisionRecord[];
  t: Translator;
  language: Language;
}) {
  return (
    <section className="settings-section">
      <h2>{t('decision_title')}</h2>
      {decisions.length ? (
        <ol className="decision-list">
          {[...decisions].reverse().map((d) => (
            <li key={d.id}>
              <p>
                {t(d.detail in catalog ? (d.detail as MessageKey) : 'decision_recorded', d.values)}
              </p>
              <time dateTime={d.at}>
                {new Date(d.at).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-PH')}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p>{t('no_decisions')}</p>
      )}
    </section>
  );
}
