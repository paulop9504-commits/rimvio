import type { AppLocale } from "@/lib/i18n/types";
import { speechLangForLocale } from "@/lib/media/speech-lang";

function pickVoice(lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }

  const prefix = lang.slice(0, 2);
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.replace("_", "-").startsWith(lang)) ??
    voices.find((voice) => voice.lang.startsWith(prefix)) ??
    voices[0] ??
    null
  );
}

export function canSpeakText() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (canSpeakText()) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(text: string, locale: AppLocale = "ko") {
  return new Promise<void>((resolve, reject) => {
    if (!canSpeakText()) {
      reject(new Error("speech_synthesis_unavailable"));
      return;
    }

    const trimmed = text.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      reject(new Error("empty_text"));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const lang = speechLangForLocale(locale);
    utterance.lang = lang;
    utterance.rate = 1;

    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("speech_failed"));

    const start = () => {
      const voice = pickVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      start();
      return;
    }

    window.speechSynthesis.addEventListener("voiceschanged", start, { once: true });
  });
}
