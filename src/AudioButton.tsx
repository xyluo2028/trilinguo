import { useEffect, useRef, useState } from 'react';
import type { Language, Locale } from '../shared/content.ts';

let activePlayback: AbortController | null = null;

export function AudioButton({ text, language, locale }: { text: string; language: Language; locale: Locale }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const playbackRef = useRef<AbortController | null>(null);
  useEffect(() => {
    setError('');
    setPlaying(false);
    return () => {
      const playback = playbackRef.current;
      playbackRef.current = null;
      playback?.abort();
    };
  }, [text, language]);

  async function play() {
    setError('');
    if (!('speechSynthesis' in window)) {
      setError(locale === 'zh' ? '此设备无法播放语音。可以先和大人一起练习。' : 'Audio is unavailable on this device. You can practise by reading together.');
      return;
    }
    activePlayback?.abort();
    const playback = new AbortController();
    playbackRef.current = playback;
    activePlayback = playback;
    const { signal } = playback;
    const synth = window.speechSynthesis;
    let utterance: SpeechSynthesisUtterance | null = null;
    let playbackTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelAudio = () => {
      if (!utterance) return;
      utterance.onend = null;
      utterance.onerror = null;
      synth.cancel();
      utterance = null;
    };
    const cleanup = () => {
      clearTimeout(playbackTimer);
      if (utterance) { utterance.onend = null; utterance.onerror = null; }
      utterance = null;
      signal.removeEventListener('abort', cancel);
      if (activePlayback === playback) activePlayback = null;
      if (playbackRef.current === playback) playbackRef.current = null;
    };
    const finish = (message?: string) => {
      const current = playbackRef.current === playback && !signal.aborted;
      cleanup();
      if (current) {
        setPlaying(false);
        if (message) setError(message);
      }
    };
    const cancel = () => {
      const current = playbackRef.current === playback;
      cancelAudio();
      cleanup();
      if (current) setPlaying(false);
    };
    signal.addEventListener('abort', cancel, { once: true });
    setPlaying(true);
    let voices = synth.getVoices();
    if (!voices.length) {
      await new Promise<void>(resolve => {
        const done = () => {
          clearTimeout(timer);
          synth.removeEventListener('voiceschanged', done);
          signal.removeEventListener('abort', done);
          resolve();
        };
        const timer = setTimeout(done, 800);
        synth.addEventListener('voiceschanged', done);
        signal.addEventListener('abort', done, { once: true });
      });
      if (signal.aborted) return;
      voices = synth.getVoices();
    }
    const voice = voices.find(value => value.localService && value.lang.toLowerCase().startsWith(language));
    if (!voice) {
      finish(locale === 'zh' ? '此设备没有所需的语音。可以换个浏览器，或先和大人一起练习。' : 'The needed voice is unavailable. Try another browser, or practise by reading together.');
      return;
    }
    if (signal.aborted) return;
    synth.cancel();
    utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = language === 'ja' ? 'ja-JP' : 'en-US';
    utterance.rate = 0.8;
    utterance.onend = () => finish();
    utterance.onerror = () => finish(locale === 'zh' ? '语音播放失败，请重试。' : 'Playback failed. Please try again.');
    playbackTimer = setTimeout(() => {
      cancelAudio();
      finish(locale === 'zh' ? '语音播放超时，请重试。' : 'Playback timed out. Please try again.');
    }, 15_000);
    try { synth.speak(utterance); }
    catch {
      cancelAudio();
      finish(locale === 'zh' ? '语音播放失败，请重试。' : 'Playback failed. Please try again.');
    }
  }
  return <div className="audio-control">
    <button className="audio-button" onClick={play} disabled={playing} type="button">
      <span aria-hidden="true">{playing ? '♪' : '▷'}</span> {locale === 'zh' ? (playing ? '播放中…' : '听一听 / 再听一次') : (playing ? 'Playing…' : 'Listen / replay')}
    </button>
    {error && <p role="status" className="audio-error">{error}</p>}
  </div>;
}
