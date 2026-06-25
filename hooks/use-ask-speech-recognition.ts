"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speechLangForLocale } from "@/lib/media/speech-lang";
import type { AppLocale } from "@/lib/i18n/types";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function readSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function canUseSpeechRecognition(): boolean {
  return readSpeechRecognitionCtor() !== null;
}

export type UseAskSpeechRecognitionInput = {
  locale?: AppLocale;
  enabled?: boolean;
  onFinalTranscript: (text: string) => void;
  onError?: (code: "unsupported" | "permission" | "failed") => void;
};

/** Globe ask sheet — browser STT (ko-KR first). */
export function useAskSpeechRecognition(input: UseAskSpeechRecognitionInput) {
  const enabled = input.enabled ?? true;
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const onFinalRef = useRef(input.onFinalTranscript);
  const onErrorRef = useRef(input.onError);
  onFinalRef.current = input.onFinalTranscript;
  onErrorRef.current = input.onError;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (listening) {
      stop();
      return;
    }

    const Ctor = readSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("unsupported");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = speechLangForLocale(input.locale);
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const parts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const chunk = event.results[index]?.[0]?.transcript?.trim();
        if (chunk) {
          parts.push(chunk);
        }
      }
      const transcript = parts.join(" ").trim();
      const last = event.results[event.results.length - 1];
      if (last?.isFinal && transcript) {
        onFinalRef.current(transcript);
        stop();
      }
    };

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      onErrorRef.current?.("failed");
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      onErrorRef.current?.("permission");
    }
  }, [enabled, input.locale, listening, stop]);

  useEffect(() => {
    if (!enabled) {
      stop();
    }
    return () => stop();
  }, [enabled, stop]);

  return { listening, start, stop, supported: canUseSpeechRecognition() };
}
