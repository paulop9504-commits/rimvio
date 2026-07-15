"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
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

const STEP_STAGGER_MS = 320;
const STEP_STAGGER_FAST_MS = 90;

function modeEyebrowKo(mode: ScoutNarrationComposePayload["mode"]): string {
  if (mode === "Replace") {
    return "검색 교체";
  }
  if (mode === "Merge") {
    return "조건 병합";
  }
  if (mode === "Continue") {
    return "조건 다듬기";
  }
  return "실행 계획";
}

/**
 * Cursor-like live Narrator stream — understanding typewriter + cascading gray logs.
 */
export function GlobeScoutNarrationStream({
  payload,
  className,
}: GlobeScoutNarrationStreamProps) {
  const reducedMotion = useReducedMotion();
  const running = payload.status === "running";
  const [revealedCount, setRevealedCount] = useState(
    reducedMotion ? payload.steps.length : 0,
  );
  const [understandingDone, setUnderstandingDone] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setRevealedCount(payload.steps.length);
      setUnderstandingDone(true);
      return;
    }
    setRevealedCount(0);
    setUnderstandingDone(false);
  }, [payload.understandingKo, payload.steps.length, reducedMotion]);

  useEffect(() => {
    if (!understandingDone || reducedMotion) {
      return;
    }
    if (revealedCount >= payload.steps.length) {
      return;
    }
    const delay =
      running || revealedCount < Math.max(2, payload.steps.length - 2)
        ? STEP_STAGGER_MS
        : STEP_STAGGER_FAST_MS;
    const id = window.setTimeout(() => {
      setRevealedCount((n) => Math.min(payload.steps.length, n + 1));
    }, delay);
    return () => window.clearTimeout(id);
  }, [
    understandingDone,
    revealedCount,
    payload.steps.length,
    reducedMotion,
    running,
  ]);

  // When scout finishes mid-reveal, accelerate remaining lines.
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
        return n + 1;
      });
    }, STEP_STAGGER_FAST_MS);
    return () => window.clearInterval(id);
  }, [running, reducedMotion, revealedCount, payload.steps.length]);

  const activeIndex =
    running && revealedCount > 0
      ? Math.min(revealedCount - 1, payload.steps.length - 1)
      : -1;

  return (
    <div
      className={cn(
        "w-full max-w-[92%] overflow-hidden rounded-2xl",
        "bg-[#0b0b0f]/[0.92] text-[#e8e8ed]",
        "shadow-[0_12px_40px_rgba(15,23,42,0.18)] ring-1 ring-white/[0.08]",
        className,
      )}
      data-globe-scout-narration-stream
      data-status={payload.status}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2">
        <span className="relative flex size-1.5">
          {running ? (
            <>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#32d74b]/60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#32d74b]" />
            </>
          ) : (
            <span className="inline-flex size-1.5 rounded-full bg-[#86868b]" />
          )}
        </span>
        <p
          className={cn(
            rimvioAssistantEyebrowClass(),
            "tracking-[0.12em] text-[#86868b]",
          )}
        >
          {modeEyebrowKo(payload.mode)}
          {payload.entityLabelKo?.trim()
            ? ` · ${payload.entityLabelKo.trim()}`
            : ""}
        </p>
        <span className="ml-auto font-mono text-[10px] text-[#636366]">
          {running ? "running" : "done"}
        </span>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <div className="space-y-1.5">
          {!understandingDone && !reducedMotion ? (
            <p className="text-[13px] font-semibold leading-relaxed text-[#f5f5f7]">
              <GlobeTypewriterText
                text={
                  payload.understandingKo.split("\n").find((l) => l.trim()) ??
                  payload.understandingKo
                }
                cps={52}
                onComplete={() => setUnderstandingDone(true)}
                cursorClassName={cn(
                  rimvioAssistantTypewriterCursorClass(),
                  "bg-[#32d74b]",
                )}
              />
            </p>
          ) : (
            payload.understandingKo.split("\n").map((line, index) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return null;
              }
              const isLead = index === 0;
              return (
                <motion.p
                  key={`${index}-${trimmed.slice(0, 16)}`}
                  initial={
                    reducedMotion || isLead
                      ? false
                      : { opacity: 0, y: 4 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: isLead ? 0 : index * 0.05 }}
                  className={cn(
                    "text-[13px] leading-relaxed",
                    isLead
                      ? "font-semibold text-[#f5f5f7]"
                      : "font-medium text-[#aeaeb2]",
                  )}
                >
                  {trimmed}
                </motion.p>
              );
            })
          )}
        </div>

        <div
          className="overflow-hidden rounded-xl bg-black/35 px-2.5 py-2 ring-1 ring-white/[0.04]"
          data-globe-scout-narration-logs
        >
          <AnimatePresence initial={false}>
            {payload.steps.slice(0, revealedCount).map((step, index) => {
              const isActive = index === activeIndex && running;
              const isComplete = !running || index < activeIndex;
              return (
                <motion.div
                  key={step.id}
                  initial={reducedMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "flex items-start gap-2 py-0.5 font-mono text-[11px] leading-relaxed",
                    isActive ? "text-[#f5f5f7]" : "text-[#8e8e93]",
                  )}
                  data-narration-step={step.id}
                  data-active={isActive ? "true" : "false"}
                >
                  <span className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center">
                    {isActive ? (
                      <Loader2 className="size-3 animate-spin text-[#32d74b]" />
                    ) : isComplete ? (
                      <Check className="size-3 text-[#32d74b]/80" strokeWidth={2.5} />
                    ) : (
                      <span className="text-[#0071e3]">&gt;</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    {step.textKo}
                    {isActive ? (
                      <span className="ml-1 inline-block h-3 w-[5px] animate-pulse rounded-[1px] bg-[#32d74b]/90 align-middle" />
                    ) : null}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {running && revealedCount < payload.steps.length ? (
            <p className="py-0.5 font-mono text-[10px] text-[#636366]">
              <span className="text-[#0071e3]">&gt;</span> …
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
