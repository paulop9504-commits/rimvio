"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { ScoutNarrationComposePayload } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { GlobeTypewriterText } from "@/components/globe/globe-typewriter-text";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  rimvioAssistantEyebrowClass,
  rimvioAssistantTypewriterCursorClass,
} from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";

export type GlobeScoutNarrationStreamProps = {
  payload: ScoutNarrationComposePayload;
  className?: string;
};

const STEP_STAGGER_MS = 280;
const STEP_STAGGER_FAST_MS = 70;
const LINE_GAP_MS = 90;

function modeEyebrowKo(mode: ScoutNarrationComposePayload["mode"]): string {
  if (mode === "Replace") {
    return "Replace · 검색 교체";
  }
  if (mode === "Merge") {
    return "Merge · 조건 병합";
  }
  if (mode === "Continue") {
    return "Continue · 조건 다듬기";
  }
  return "Plan · 실행";
}

function understandingLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function ScoutLogLine({
  textKo,
  isActive,
  isComplete,
  typewrite,
  reducedMotion,
  onTyped,
}: {
  textKo: string;
  isActive: boolean;
  isComplete: boolean;
  typewrite: boolean;
  reducedMotion: boolean;
  onTyped?: () => void;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: -10, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex items-start gap-2 overflow-hidden rounded-md px-1.5 py-1 font-mono text-[11px] leading-relaxed",
        isActive && "bg-[#32d74b]/[0.08] text-[#f5f5f7]",
        !isActive && isComplete && "text-[#8e8e93]",
        !isActive && !isComplete && "text-[#636366]",
      )}
      data-narration-step-active={isActive ? "true" : "false"}
    >
      {isActive ? (
        <motion.span
          layoutId="scout-narration-active-rail"
          className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-[#32d74b]"
          initial={false}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      ) : null}
      <span className="mt-[2px] flex size-3.5 shrink-0 items-center justify-center">
        {isActive ? (
          <Loader2 className="size-3 animate-spin text-[#32d74b]" />
        ) : isComplete ? (
          <Check className="size-3 text-[#32d74b]/85" strokeWidth={2.5} />
        ) : (
          <span className="text-[#5ac8fa]">›</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        {typewrite && !reducedMotion ? (
          <GlobeTypewriterText
            text={textKo}
            cps={68}
            onComplete={onTyped}
            cursorClassName={cn(
              rimvioAssistantTypewriterCursorClass(),
              "bg-[#32d74b]",
            )}
          />
        ) : (
          textKo
        )}
        {isActive && (reducedMotion || !typewrite) ? (
          <span className="ml-1 inline-block h-3 w-[5px] animate-pulse rounded-[1px] bg-[#32d74b]/90 align-middle" />
        ) : null}
      </span>
    </motion.div>
  );
}

/**
 * Cursor Agent-style live Narrator — typewriter understanding + cascading terminal logs.
 */
export function GlobeScoutNarrationStream({
  payload,
  className,
}: GlobeScoutNarrationStreamProps) {
  const reducedMotion = useReducedMotion();
  const running = payload.status === "running";
  const lines = useMemo(
    () => understandingLines(payload.understandingKo),
    [payload.understandingKo],
  );

  const [typedLineCount, setTypedLineCount] = useState(
    reducedMotion ? lines.length : 0,
  );
  const [revealedCount, setRevealedCount] = useState(
    reducedMotion ? payload.steps.length : 0,
  );
  const [typingStepIndex, setTypingStepIndex] = useState<number | null>(
    reducedMotion ? null : 0,
  );
  const [elapsedSec, setElapsedSec] = useState(0);

  // Reset only when understanding content changes (new scout), not when live steps append.
  useEffect(() => {
    if (reducedMotion) {
      setTypedLineCount(lines.length);
      setRevealedCount(payload.steps.length);
      setTypingStepIndex(null);
      return;
    }
    setTypedLineCount(0);
    setRevealedCount(0);
    setTypingStepIndex(0);
    setElapsedSec(0);
  }, [payload.understandingKo, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps -- steps grow live

  useEffect(() => {
    if (!running || reducedMotion) {
      return;
    }
    const id = window.setInterval(() => {
      setElapsedSec((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, reducedMotion, payload.status, payload.steps.length]);

  const understandingDone = typedLineCount >= lines.length;

  // Advance understanding lines with a short beat between lines.
  useEffect(() => {
    if (reducedMotion || typedLineCount >= lines.length) {
      return;
    }
    // Waiting for typewriter onComplete on current line — no timer needed
    // except when empty.
    if (!lines[typedLineCount]) {
      setTypedLineCount(lines.length);
    }
  }, [typedLineCount, lines, reducedMotion]);

  // After understanding finishes, cascade log lines.
  useEffect(() => {
    if (!understandingDone || reducedMotion) {
      return;
    }
    if (revealedCount >= payload.steps.length) {
      return;
    }
    // Wait for previous step typewriter before revealing next — unless done/running catch-up.
    if (
      typingStepIndex !== null &&
      typingStepIndex === revealedCount - 1 &&
      revealedCount > 0 &&
      running
    ) {
      return;
    }
    const delay =
      running || revealedCount < Math.max(2, payload.steps.length - 2)
        ? STEP_STAGGER_MS
        : STEP_STAGGER_FAST_MS;
    const id = window.setTimeout(() => {
      setRevealedCount((n) => {
        const next = Math.min(payload.steps.length, n + 1);
        setTypingStepIndex(next - 1);
        return next;
      });
    }, delay);
    return () => window.clearTimeout(id);
  }, [
    understandingDone,
    revealedCount,
    payload.steps.length,
    reducedMotion,
    running,
    typingStepIndex,
  ]);

  // Scout finished — flush remaining logs quickly.
  useEffect(() => {
    if (running || reducedMotion) {
      return;
    }
    if (revealedCount >= payload.steps.length) {
      return;
    }
    const id = window.setInterval(() => {
      setRevealedCount((n) => {
        if (n >= payload.steps.length) {
          return n;
        }
        const next = n + 1;
        setTypingStepIndex(null);
        return next;
      });
    }, STEP_STAGGER_FAST_MS);
    return () => window.clearInterval(id);
  }, [running, reducedMotion, revealedCount, payload.steps.length]);

  // Live-appended steps after understanding already done — keep cascading.
  useEffect(() => {
    if (!understandingDone || reducedMotion) {
      return;
    }
    if (revealedCount > payload.steps.length) {
      setRevealedCount(payload.steps.length);
    }
  }, [payload.steps.length, revealedCount, understandingDone, reducedMotion]);

  const activeIndex =
    running && revealedCount > 0
      ? Math.min(revealedCount - 1, payload.steps.length - 1)
      : -1;

  const handleLineComplete = (index: number) => {
    window.setTimeout(() => {
      setTypedLineCount((n) => Math.max(n, index + 1));
    }, LINE_GAP_MS);
  };

  const handleStepTyped = (index: number) => {
    if (typingStepIndex === index) {
      setTypingStepIndex(null);
    }
  };

  return (
    <motion.div
      className={cn(
        "rimvio-scout-narration relative w-full max-w-[94%] overflow-hidden rounded-2xl",
        "bg-[#0b0b0f]/[0.94] text-[#e8e8ed]",
        "shadow-[0_16px_48px_rgba(15,23,42,0.28)]",
        running && "rimvio-scout-narration--running",
        className,
      )}
      data-globe-scout-narration-stream
      data-status={payload.status}
      initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rimvio-scout-narration__glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="rimvio-scout-narration__scan pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex items-center gap-2 border-b border-white/[0.07] px-3.5 py-2.5">
        <span className="relative flex size-2">
          {running ? (
            <>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#32d74b]/55" />
              <span className="relative inline-flex size-2 rounded-full bg-[#32d74b] shadow-[0_0_10px_rgba(50,215,75,0.75)]" />
            </>
          ) : (
            <span className="inline-flex size-2 rounded-full bg-[#86868b]" />
          )}
        </span>
        <Sparkles
          className={cn(
            "size-3.5 shrink-0",
            running ? "animate-pulse text-[#32d74b]" : "text-[#636366]",
          )}
          strokeWidth={2}
        />
        <p
          className={cn(
            rimvioAssistantEyebrowClass(),
            "tracking-[0.1em] text-[#aeaeb2]",
          )}
        >
          Agent
          {payload.entityLabelKo?.trim()
            ? ` · ${payload.entityLabelKo.trim()}`
            : ""}
        </p>
        <span className="hidden rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] text-[#8e8e93] sm:inline">
          {modeEyebrowKo(payload.mode)}
        </span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[10px] tabular-nums text-[#636366]">
          {running ? (
            <>
              <span className="text-[#32d74b]">working</span>
              <span>{elapsedSec.toFixed(0)}s</span>
            </>
          ) : (
            <span>done</span>
          )}
        </span>
      </div>

      <div className="relative space-y-3 px-3.5 py-3">
        <div className="space-y-1.5" data-globe-scout-narration-understanding>
          {lines.map((line, index) => {
            if (index > typedLineCount) {
              return null;
            }
            const isTyping = index === typedLineCount && !reducedMotion;
            const isLead = index === 0;
            if (isTyping) {
              return (
                <p
                  key={`typing-${index}`}
                  className={cn(
                    "text-[13px] leading-relaxed",
                    isLead
                      ? "font-semibold text-[#f5f5f7]"
                      : "font-medium text-[#c7c7cc]",
                  )}
                >
                  <GlobeTypewriterText
                    text={line}
                    cps={isLead ? 48 : 56}
                    onComplete={() => handleLineComplete(index)}
                    cursorClassName={cn(
                      rimvioAssistantTypewriterCursorClass(),
                      "bg-[#32d74b]",
                    )}
                  />
                </p>
              );
            }
            return (
              <motion.p
                key={`done-${index}-${line.slice(0, 12)}`}
                initial={reducedMotion ? false : { opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "text-[13px] leading-relaxed",
                  isLead
                    ? "font-semibold text-[#f5f5f7]"
                    : "font-medium text-[#aeaeb2]",
                )}
              >
                {line}
              </motion.p>
            );
          })}
        </div>

        <div
          className="rimvio-scout-narration__terminal relative overflow-hidden rounded-xl bg-black/45 px-1.5 py-1.5 ring-1 ring-white/[0.05]"
          data-globe-scout-narration-logs
        >
          <div className="mb-1 flex items-center gap-1.5 px-1.5 pt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#636366]">
            <span className="text-[#5ac8fa]">›_</span>
            system log
            {running ? (
              <span className="ml-auto inline-flex items-center gap-1 normal-case tracking-normal text-[#32d74b]/90">
                <span className="size-1 animate-pulse rounded-full bg-[#32d74b]" />
                live
              </span>
            ) : null}
          </div>
          <AnimatePresence initial={false}>
            {payload.steps.slice(0, revealedCount).map((step, index) => {
              const isActive = index === activeIndex && running;
              const isComplete = !running || index < activeIndex;
              const typewrite =
                !reducedMotion &&
                running &&
                typingStepIndex === index &&
                index === revealedCount - 1;
              return (
                <ScoutLogLine
                  key={step.id}
                  textKo={step.textKo}
                  isActive={isActive}
                  isComplete={isComplete}
                  typewrite={Boolean(typewrite)}
                  reducedMotion={reducedMotion}
                  onTyped={() => handleStepTyped(index)}
                />
              );
            })}
          </AnimatePresence>
          {running && revealedCount < payload.steps.length ? (
            <p className="px-1.5 py-1 font-mono text-[10px] text-[#48484a]">
              <span className="text-[#5ac8fa]">›</span>{" "}
              <span className="inline-flex gap-0.5">
                <span className="animate-pulse">·</span>
                <span className="animate-pulse [animation-delay:120ms]">·</span>
                <span className="animate-pulse [animation-delay:240ms]">·</span>
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
