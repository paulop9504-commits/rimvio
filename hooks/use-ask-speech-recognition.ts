"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speechLangForLocale } from "@/lib/media/speech-lang";
import type { AppLocale } from "@/lib/i18n/types";

/** Minimal Web Speech API surface — avoids requiring DOM lib in CI typecheck. */
type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ 0?: { transcript?: string }; isFinal?: boolean }>;
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

/** Default — tolerate ~1s stumble without cutting off. */
export const VOICE_SILENCE_FINALIZE_MS = 3200;
/** Nudge to continue during a longer pause — still listening. */
export const VOICE_PAUSE_HINT_MS = 1800;

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

export type VoiceListeningPhase = "idle" | "listening" | "pause_hint";

export type UseAskSpeechRecognitionInput = {
  locale?: AppLocale;
  enabled?: boolean;
  /** Ms of silence after last heard speech before finalize — default 3200. */
  silenceFinalizeMs?: number;
  /** Ms of pause before “keep going” hint — default 1800. */
  pauseHintAfterMs?: number;
  onFinalTranscript: (text: string) => void;
  /** Live dictation — update composer text while user is still speaking. */
  onInterimTranscript?: (text: string) => void;
  /** Short pause mid-utterance — invite user to continue, do not submit. */
  onPauseHint?: () => void;
  onError?: (code: "unsupported" | "permission" | "failed") => void;
};

/** Globe STT — continuous listen, patient silence gate, pause hints. */
export function useAskSpeechRecognition(input: UseAskSpeechRecognitionInput) {
  const enabled = input.enabled ?? true;
  const silenceFinalizeMs = input.silenceFinalizeMs ?? VOICE_SILENCE_FINALIZE_MS;
  const pauseHintAfterMs = input.pauseHintAfterMs ?? VOICE_PAUSE_HINT_MS;

  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<VoiceListeningPhase>("idle");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const finalizedRef = useRef("");
  const interimRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseHintCycleRef = useRef(false);

  const onFinalRef = useRef(input.onFinalTranscript);
  const onInterimRef = useRef(input.onInterimTranscript);
  const onPauseHintRef = useRef(input.onPauseHint);
  const onErrorRef = useRef(input.onError);
  onFinalRef.current = input.onFinalTranscript;
  onInterimRef.current = input.onInterimTranscript;
  onPauseHintRef.current = input.onPauseHint;
  onErrorRef.current = input.onError;

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (pauseHintTimerRef.current) {
      clearTimeout(pauseHintTimerRef.current);
      pauseHintTimerRef.current = null;
    }
  }, []);

  const combinedTranscript = useCallback(() => {
    return `${finalizedRef.current} ${interimRef.current}`.replace(/\s+/g, " ").trim();
  }, []);

  const emitInterim = useCallback(() => {
    const text = combinedTranscript();
    onInterimRef.current?.(text);
  }, [combinedTranscript]);

  const stopEngine = useCallback(() => {
    clearTimers();
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setPhase("idle");
  }, [clearTimers]);

  const finalizeAndStop = useCallback(() => {
    const text = combinedTranscript();
    intentionalStopRef.current = true;
    stopEngine();
    if (text) {
      onFinalRef.current(text);
    }
  }, [combinedTranscript, stopEngine]);

  const scheduleSilenceGate = useCallback(() => {
    clearTimers();
    pauseHintCycleRef.current = false;
    setPhase("listening");

    pauseHintTimerRef.current = setTimeout(() => {
      if (!shouldListenRef.current) {
        return;
      }
      if (!pauseHintCycleRef.current) {
        pauseHintCycleRef.current = true;
        setPhase("pause_hint");
        onPauseHintRef.current?.();
      }
    }, pauseHintAfterMs);

    silenceTimerRef.current = setTimeout(() => {
      if (!shouldListenRef.current) {
        return;
      }
      finalizeAndStop();
    }, silenceFinalizeMs);
  }, [clearTimers, finalizeAndStop, pauseHintAfterMs, silenceFinalizeMs]);

  const beginRecognition = useCallback(() => {
    const Ctor = readSpeechRecognitionCtor();
    if (!Ctor || !shouldListenRef.current) {
      return;
    }

    const recognition = new Ctor();
    recognition.lang = speechLangForLocale(input.locale);
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const chunk = result?.[0]?.transcript ?? "";
        if (!chunk) {
          continue;
        }
        if (result.isFinal) {
          finalizedRef.current = `${finalizedRef.current} ${chunk}`.replace(/\s+/g, " ").trim();
          interim = "";
        } else {
          interim = chunk;
        }
      }
      interimRef.current = interim;
      emitInterim();
      scheduleSilenceGate();
    };

    recognition.onerror = () => {
      if (!shouldListenRef.current) {
        return;
      }
      intentionalStopRef.current = true;
      stopEngine();
      onErrorRef.current?.("failed");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (intentionalStopRef.current || !shouldListenRef.current) {
        setListening(false);
        setPhase("idle");
        return;
      }
      window.setTimeout(() => {
        if (shouldListenRef.current && !intentionalStopRef.current) {
          beginRecognition();
        }
      }, 120);
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      setPhase("listening");
    } catch {
      recognitionRef.current = null;
      shouldListenRef.current = false;
      setListening(false);
      setPhase("idle");
      onErrorRef.current?.("permission");
    }
  }, [emitInterim, input.locale, scheduleSilenceGate, stopEngine]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    stopEngine();
  }, [stopEngine]);

  const start = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (listening || shouldListenRef.current) {
      finalizeAndStop();
      return;
    }

    const Ctor = readSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("unsupported");
      return;
    }

    intentionalStopRef.current = false;
    shouldListenRef.current = true;
    finalizedRef.current = "";
    interimRef.current = "";
    beginRecognition();
  }, [beginRecognition, enabled, finalizeAndStop, listening]);

  useEffect(() => {
    if (!enabled) {
      intentionalStopRef.current = true;
      stopEngine();
    }
    return () => {
      intentionalStopRef.current = true;
      stopEngine();
    };
  }, [enabled, stopEngine]);

  return {
    listening,
    phase,
    start,
    stop,
    supported: canUseSpeechRecognition(),
  };
}
