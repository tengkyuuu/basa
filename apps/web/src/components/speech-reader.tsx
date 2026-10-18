'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicSession, Snapshot } from '@/lib/domain';
import type { MessageKey } from '@/lib/i18n';
import { SPEECH_LIMITS } from '@basabridge/speech/limits';
import { SpeakButton } from './spoken-text';

type Props = {
  session: Pick<PublicSession, 'id' | 'voice'>;
  practiceWord?: string;
  onMisheard?: (index: number, marked: boolean) => Promise<boolean>;
  onWordListen?: (index: number) => Promise<boolean>;
  under13: boolean;
  consent: boolean;
  configured: boolean;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  onConsent: (value: boolean) => Promise<boolean>;
  onSnapshot: (snapshot: Snapshot) => void;
  onBusy: (busy: boolean) => void;
};

export function SpeechReader({
  session,
  practiceWord,
  onMisheard,
  onWordListen,
  under13,
  consent,
  configured,
  t,
  onConsent,
  onSnapshot,
  onBusy,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'recording' | 'sending'>('idle');
  const [error, setError] = useState<MessageKey | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [agree, setAgree] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const busy = status !== 'idle';
  function release() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }
  function cancel() {
    generation.current++;
    if (recorder.current) {
      recorder.current.onstop = null;
      recorder.current.ondataavailable = null;
      if (recorder.current.state !== 'inactive') recorder.current.stop();
    }
    release();
    controller.current?.abort();
    onBusy(false);
    if (mounted.current) setStatus('idle');
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel();
    };
  }, []);

  async function record() {
    if (busy) return;
    window.speechSynthesis?.cancel();
    setError(null);
    setStatus('starting');
    onBusy(true);
    const requestGeneration = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
        throw new Error('mic_unavailable');
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true },
        video: false,
      });
      if (!mounted.current || requestGeneration !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mime) throw new Error('mic_unavailable');
      const capture = new MediaRecorder(media, { mimeType: mime, audioBitsPerSecond: 32000 });
      recorder.current = capture;
      const chunks: Blob[] = [];
      let bytes = 0;
      capture.ondataavailable = (event) => {
        bytes += event.data.size;
        if (bytes > SPEECH_LIMITS.maxBytes) {
          chunks.length = 0;
          cancel();
          setError('speech_invalid');
        } else if (event.data.size) chunks.push(event.data);
      };
      capture.onerror = () => {
        chunks.length = 0;
        cancel();
        setError('mic_unavailable');
      };
      capture.onstop = async () => {
        release();
        if (!mounted.current) return;
        setStatus('sending');
        const audio = new Blob(chunks, { type: mime.split(';')[0] });
        chunks.length = 0;
        controller.current = new AbortController();
        try {
          const response = await fetch('/api/speech', {
            method: 'POST',
            body: audio,
            headers: {
              'Content-Type': audio.type,
              'X-Reading-Session': session.id,
              'X-Recording-Id': crypto.randomUUID(),
              ...(practiceWord ? { 'X-Practice-Word': practiceWord } : {}),
            },
            signal: AbortSignal.any([controller.current.signal, AbortSignal.timeout(80_000)]),
          });
          const data = await response.json();
          if (!response.ok) {
            const allowed: MessageKey[] = [
              'speech_busy',
              'no_speech',
              'speech_invalid',
              'guardian_required',
              'speech_consent_required',
              'tries_used',
              'too_many',
            ];
            if (mounted.current)
              setError(allowed.includes(data.error) ? data.error : 'speech_unavailable');
          } else if (mounted.current) onSnapshot(data);
        } catch {
          if (mounted.current) setError('speech_unavailable');
        } finally {
          if (mounted.current) setStatus('idle');
          onBusy(false);
        }
      };
      capture.start(1000);
      setStatus('recording');
      setSeconds(0);
      const started = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(elapsed);
        if (
          elapsed >= (practiceWord ? SPEECH_LIMITS.maxWordSeconds : SPEECH_LIMITS.maxSeconds) &&
          capture.state === 'recording'
        )
          capture.stop();
      }, 1000);
    } catch {
      release();
      setStatus('idle');
      onBusy(false);
      setError('mic_unavailable');
    }
  }
  const latest = session.voice.latest;
  const exhausted = session.voice.allowed !== null && session.voice.used >= session.voice.allowed;
  return (
    <section className="speech-panel" aria-busy={busy}>
      <h2>{t('read_aloud')}</h2>
      {under13 ? (
        <p>{t('guardian_required')}</p>
      ) : !configured ? (
        <p>{t('speech_unavailable')}</p>
      ) : (
        <>
          {!consent ? (
            <div className="form-stack">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                />
                {t('speech_consent')}
              </label>
              <button
                className="secondary"
                disabled={!agree || busy}
                onClick={() => void onConsent(true)}
              >
                {t('enable_mic')}
              </button>
            </div>
          ) : (
            <>
              <p>{t('speech_privacy')}</p>
              <p>
                {!practiceWord &&
                  t(session.voice.allowed === null ? 'tries_unlimited' : 'tries_count', {
                    used: session.voice.used,
                    allowed: session.voice.allowed ?? 0,
                  })}
              </p>
              <div className="button-row">
                {status === 'recording' ? (
                  <button className="primary" onClick={() => recorder.current?.stop()}>
                    {t('stop_recording')}
                  </button>
                ) : (
                  <button
                    className="secondary"
                    disabled={busy || exhausted || session.voice.pending}
                    onClick={() => void record()}
                  >
                    {t(
                      status === 'sending'
                        ? 'analysing_voice'
                        : status === 'starting'
                          ? 'opening_mic'
                          : 'start_recording',
                    )}
                  </button>
                )}
                {(status === 'recording' || status === 'starting') && (
                  <button className="text-button" onClick={cancel}>
                    {t('cancel_recording')}
                  </button>
                )}
                {!busy && (
                  <button className="text-button" onClick={() => void onConsent(false)}>
                    {t('disable_mic')}
                  </button>
                )}
              </div>
              {status === 'recording' && (
                <p role="status">
                  {t('recording_limit', {
                    seconds,
                    limit: practiceWord ? SPEECH_LIMITS.maxWordSeconds : SPEECH_LIMITS.maxSeconds,
                  })}
                </p>
              )}
              {exhausted && <p>{t('tries_used')}</p>}
            </>
          )}
        </>
      )}
      {error && (
        <p className="message error" role="alert">
          {t(error)}
        </p>
      )}
      {latest && (
        <div className="speech-result">
          <h3>
            {t(
              practiceWord
                ? 'word_practice_result_title'
                : latest.completed
                  ? 'voice_complete'
                  : 'voice_incomplete',
            )}
          </h3>
          <p>
            {t(practiceWord ? 'word_practice_result' : 'voice_counts', {
              right: latest.wordsRight,
              total: latest.wordsTotal,
              pace: latest.wordsPerMinute,
            })}
          </p>
          <p className="muted">{t('speech_accuracy')}</p>
          {!!session.voice.review?.flaggedWords && (
            <p className="message" role="status">
              {t('recognition_review_range', {
                lower: session.voice.review.originalWordsRight,
                upper: session.voice.review.possibleWordsRight,
                total: session.voice.review.referenceWords,
              })}
            </p>
          )}
          <details>
            <summary>{t('voice_words')}</summary>
            <ul className="word-results">
              {latest.words
                .map((word, index) => ({ word, index }))
                .filter(({ word }) => word.outcome !== 'correct' || word.confidence < 0.5)
                .map(({ word, index }) => (
                  <li key={index}>
                    <span lang="en">{word.expected ?? word.heard}</span>:{' '}
                    {t(
                      word.confidence < 0.5
                        ? 'word_uncertain'
                        : word.outcome === 'omission'
                          ? 'word_missing'
                          : word.outcome === 'insertion' || word.outcome === 'repetition'
                            ? 'word_extra'
                            : 'word_different',
                    )}
                    {word.markedMisheard && <small>{t('marked_misheard')}</small>}
                    {word.expected && onMisheard && (
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() => void onMisheard(index, !word.markedMisheard)}
                      >
                        {t(word.markedMisheard ? 'undo_misheard' : 'mark_misheard')}
                      </button>
                    )}
                    {word.expected && onWordListen && (
                      <SpeakButton
                        text={word.expected}
                        language="en"
                        t={t}
                        disabled={busy}
                        beforeSpeak={() => onWordListen(index)}
                      />
                    )}
                  </li>
                ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}
