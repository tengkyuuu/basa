'use client';
import { useEffect, useRef, useState } from 'react';
import type { Language, MessageKey } from '@/lib/i18n';
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
export function SpeakButton({
  text,
  language,
  t,
  beforeSpeak,
  disabled = false,
  auto = false,
}: {
  text: string;
  language: Language;
  t: Translator;
  beforeSpeak?: () => Promise<boolean>;
  disabled?: boolean;
  auto?: boolean;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    generation.current += 1;
    return () => {
      generation.current += 1;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [text, language]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update);
      window.speechSynthesis.cancel();
    };
  }, []);
  async function speak() {
    if (disabled || pending.current) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const voice = voices.find((v) =>
      language === 'fil' ? /^(fil|tl)(-|$)/i.test(v.lang) : /^en(-|$)/i.test(v.lang),
    );
    if (!voice) {
      setUnavailable(true);
      return;
    }
    const started = generation.current;
    pending.current = true;
    try {
      if (beforeSpeak && !(await beforeSpeak())) return;
    } finally {
      pending.current = false;
    }
    if (started !== generation.current) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setUnavailable(true);
    };
    setUnavailable(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }
  useEffect(() => {
    if (auto && voices.length && !disabled) void speak();
  }, [auto, text, voices.length]);
  return (
    <span className="speech-control">
      <button
        type="button"
        className="text-button"
        disabled={disabled}
        onClick={() => void speak()}
      >
        {t(speaking ? 'stop_speaking' : 'speak')}
      </button>
      {unavailable && <small role="status">{t('voice_not_available')}</small>}
    </span>
  );
}
