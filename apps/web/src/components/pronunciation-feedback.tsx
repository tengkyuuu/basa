'use client';
import type { TryAnalysis } from '@basabridge/contracts';
import type { MessageKey } from '@/lib/i18n';
import { SpeakButton } from './spoken-text';

export function PronunciationFeedback({
  analysis,
  t,
  busy,
  onWordListen,
  onMisheard,
  context = 'reading',
}: {
  analysis: TryAnalysis;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  busy: boolean;
  onWordListen?: (index: number) => Promise<boolean>;
  onMisheard?: (index: number, marked: boolean) => Promise<boolean>;
  context?: 'reading' | 'practice' | 'saved' | 'parent';
}) {
  const report = analysis.pronunciation;
  if (!report) return null;
  const practice = report.words.filter(
    (w) => w.accuracy < 60 || w.phonemes.some((p) => p.accuracy < 60),
  );
  return (
    <section className="pronunciation-feedback" aria-label={t('pronunciation_title')}>
      <h3>{t('pronunciation_title')}</h3>
      <p className="muted">{t('pronunciation_estimate')}</p>
      <dl className="pronunciation-scores">
        {(['accuracy', 'fluency', 'completeness'] as const).map((key) => (
          <div key={key}>
            <dt>{t(`pronunciation_${key}`)}</dt>
            <dd>
              {report[key] === null
                ? t('pronunciation_not_assessed')
                : t('pronunciation_score', { score: Math.round(report[key]) })}
            </dd>
          </div>
        ))}
      </dl>
      <h4>{t('pronunciation_practice')}</h4>
      <p>
        {t(
          practice.length
            ? context === 'reading'
              ? 'pronunciation_next'
              : `pronunciation_${context}_next`
            : context === 'reading'
              ? 'pronunciation_no_flags'
              : context === 'practice'
                ? 'pronunciation_practice_no_flags'
                : 'pronunciation_saved_no_flags',
        )}
      </p>
      {!!practice.length && (
        <ul className="pronunciation-words">
          {practice.map((item) => {
            const word = analysis.words[item.alignmentIndex];
            if (!word?.expected) return null;
            return (
              <li key={item.alignmentIndex}>
                <div className="pronunciation-word-heading">
                  <strong lang="en">{word.expected}</strong>
                  <span>{t('pronunciation_score', { score: Math.round(item.accuracy) })}</span>
                </div>
                <p>
                  {t(
                    word.markedMisheard
                      ? 'marked_misheard'
                      : word.confidence < 0.5
                        ? 'word_uncertain'
                        : 'pronunciation_check',
                  )}
                </p>
                {item.phonemes.some((p) => p.accuracy < 60) && (
                  <p>
                    {t('pronunciation_sounds')}{' '}
                    {item.phonemes
                      .filter((p) => p.accuracy < 60)
                      .map((p, index) => (
                        <span key={index} lang="en" className="phoneme">
                          /{p.phoneme}/ {Math.round(p.accuracy)}
                        </span>
                      ))}
                  </p>
                )}
                <div className="button-row">
                  {onWordListen && (
                    <SpeakButton
                      text={word.expected}
                      language="en"
                      t={t}
                      disabled={busy}
                      beforeSpeak={() => onWordListen(item.alignmentIndex)}
                    />
                  )}
                  {onMisheard && (
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => void onMisheard(item.alignmentIndex, !word.markedMisheard)}
                    >
                      {t(word.markedMisheard ? 'undo_misheard' : 'mark_misheard')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <details>
        <summary>{t('pronunciation_all')}</summary>
        <ul className="word-results">
          {report.words.map((item) => (
            <li key={item.alignmentIndex}>
              <span lang="en">{analysis.words[item.alignmentIndex]?.expected}</span>
              {': '}
              {t('pronunciation_score', { score: Math.round(item.accuracy) })}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
