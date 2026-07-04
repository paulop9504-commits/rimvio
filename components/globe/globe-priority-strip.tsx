"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ListTodo,
  Sparkles,
  Ticket,
} from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { PriorityStripPayload } from "@/lib/globe/priority-strip";
import { cn } from "@/lib/utils";

export type GlobePriorityStripProps = {
  payload: PriorityStripPayload | null;
  queueCount?: number;
  onMainAction?: (payload: Extract<PriorityStripPayload, { kind: "main_action" }>) => void;
  onLearnChoice?: (payload: PriorityStripPayload, choiceId: string) => void;
  onLearnLater?: (payload: PriorityStripPayload) => void;
  onOpenQueue?: () => void;
  className?: string;
};

function headerIcon(payload: PriorityStripPayload) {
  if (payload.kind === "main_action") {
    return Ticket;
  }
  if (payload.kind === "queue") {
    return ListTodo;
  }
  return Sparkles;
}

function headerTitle(payload: PriorityStripPayload): string {
  if (payload.kind === "queue" && payload.queueCount > 1) {
    return copy.globe.priorityStrip.queueTitle(
      payload.titleKo,
      payload.queueCount,
    );
  }
  return payload.titleKo;
}

function headerSubtitle(payload: PriorityStripPayload): string | null {
  if (payload.kind === "main_action") {
    return payload.subtitleKo;
  }
  if (payload.kind === "queue") {
    return payload.subtitleKo;
  }
  return null;
}

/** Single top card — MAIN resource or learn chips. Collapse stays one surface. */
export function GlobePriorityStrip({
  payload,
  onMainAction,
  onLearnChoice,
  onLearnLater,
  onOpenQueue,
  className,
}: GlobePriorityStripProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmLine, setConfirmLine] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) {
      setExpanded(false);
      return;
    }
    setExpanded(Boolean(payload.autoExpand));
  }, [payload?.id]);

  useEffect(() => {
    if (!confirmLine) {
      return;
    }
    const timer = window.setTimeout(() => setConfirmLine(null), 1600);
    return () => window.clearTimeout(timer);
  }, [confirmLine]);

  if (confirmLine) {
    return (
      <div
        className={cn("pointer-events-auto w-full max-w-[22rem]", className)}
        data-globe-priority-strip
        data-globe-priority-kind="confirm"
      >
        <div className="rounded-[1.05rem] bg-white/94 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(2,32,71,0.14)] ring-1 ring-black/[0.06] backdrop-blur-xl">
          <p className="text-[13px] font-semibold text-[#191f28]">{confirmLine}</p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  const Icon = headerIcon(payload);
  const isProtect = payload.kind === "protect";
  const isLearn =
    payload.kind === "help_learn" || payload.kind === "protect";

  return (
    <div
      className={cn("pointer-events-auto w-full max-w-[22rem]", className)}
      data-globe-priority-strip
      data-globe-priority-kind={payload.kind}
      data-globe-priority-expanded={expanded ? "true" : "false"}
    >
      <div
        className={cn(
          "overflow-hidden rounded-[1.05rem] shadow-[0_8px_28px_rgba(2,32,71,0.14)] ring-1 backdrop-blur-xl",
          isProtect
            ? "bg-[#fff7ed]/96 ring-orange-200/80"
            : "bg-white/94 ring-black/[0.06]",
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left active:bg-black/[0.03]"
          aria-expanded={expanded}
          aria-label={
            expanded
              ? copy.globe.priorityStrip.collapseAria
              : copy.globe.priorityStrip.expandAria
          }
          data-globe-priority-strip-toggle
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              isProtect
                ? "bg-orange-100 text-orange-700"
                : "bg-[#eef4ff] text-[#3182f6]",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-snug text-[#191f28]">
              {headerTitle(payload)}
            </span>
            {headerSubtitle(payload) ? (
              <span className="mt-0.5 block truncate text-[11px] font-medium text-[#8b95a1]">
                {headerSubtitle(payload)}
              </span>
            ) : null}
          </span>
          {expanded ? (
            <ChevronUp className="size-4 shrink-0 text-[#8b95a1]" aria-hidden />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-[#8b95a1]" aria-hidden />
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key={payload.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-black/[0.05] px-3 pb-3 pt-2">
                {payload.kind === "main_action" ? (
                  <button
                    type="button"
                    onClick={() => onMainAction?.(payload)}
                    className="flex h-11 w-full items-center justify-center rounded-[0.85rem] bg-[#191f28] text-[14px] font-semibold text-white active:scale-[0.99]"
                    data-globe-priority-main-cta
                  >
                    {payload.ctaLabelKo}
                  </button>
                ) : null}

                {isLearn ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {payload.learn.choices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => {
                            onLearnChoice?.(payload, choice.id);
                            setConfirmLine(copy.globe.priorityStrip.learned);
                          }}
                          className="min-h-11 rounded-[0.85rem] bg-[#f2f4f6] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[#191f28] active:scale-[0.98]"
                          data-globe-priority-learn-choice={choice.id}
                        >
                          {choice.labelKo}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onLearnLater?.(payload)}
                      className="h-9 rounded-[0.75rem] text-[12px] font-semibold text-[#8b95a1] active:bg-black/[0.03]"
                      data-globe-priority-learn-later
                    >
                      {copy.globe.priorityStrip.later}
                    </button>
                  </div>
                ) : null}

                {payload.kind === "queue" ? (
                  <button
                    type="button"
                    onClick={() => onOpenQueue?.()}
                    className="flex h-11 w-full items-center justify-center rounded-[0.85rem] bg-[#191f28] text-[14px] font-semibold text-white active:scale-[0.99]"
                    data-globe-priority-queue-cta
                  >
                    {copy.globe.priorityStrip.openQueue}
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
