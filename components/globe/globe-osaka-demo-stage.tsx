"use client";

/**
 * Osaka 30s demo stage — progress + 승인 / 뒤로 / 취소 (L1 copy only).
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  OSAKA_30S_DEMO_STEPS,
  type Osaka30sDemoProgress,
} from "@/lib/globe/osaka-demo";
import { cn } from "@/lib/utils";

export type GlobeOsakaDemoStageProps = {
  readonly progress: Osaka30sDemoProgress | null;
  readonly running: boolean;
  readonly approving?: boolean;
  readonly onApprove?: () => void;
  readonly onRewind?: () => void;
  readonly onContinue?: () => void;
  readonly onCancel?: () => void;
  readonly onDismiss?: () => void;
  readonly className?: string;
};

export function GlobeOsakaDemoStage({
  progress,
  running,
  approving = false,
  onApprove,
  onRewind,
  onContinue,
  onCancel,
  onDismiss,
  className,
}: GlobeOsakaDemoStageProps) {
  if (!running && !progress) {
    return null;
  }

  const activeIndex = progress?.stepIndex ?? 0;
  const reply = progress?.replyKo?.trim() || null;
  const awaiting = progress?.status === "awaiting_approve";
  const cancelled = progress?.errorKo === "cancelled";
  const canRewind = Boolean(progress?.canRewind && onRewind);
  const canContinue =
    Boolean(onContinue) &&
    progress?.status === "done" &&
    !progress.done &&
    !awaiting;
  const showControls =
    Boolean(onCancel) &&
    !progress?.done &&
    progress?.status !== "error" &&
    !cancelled;

  return (
    <AnimatePresence>
      <motion.section
        key="osaka-30s-demo"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={cn(
          "pointer-events-auto w-[min(100%,22rem)] space-y-2.5 rounded-2xl bg-white/96 px-3.5 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.05]",
          className,
        )}
        data-globe-osaka-demo-stage
        aria-label="오사카 데모"
      >
        <header className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b95a1]">
              30s
            </p>
            <h3 className="text-[15px] font-bold tracking-tight text-[#191f28]">
              오사카 한 바퀴
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {showControls ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full px-2 py-1 text-[11px] font-semibold text-[#8b95a1] hover:bg-black/[0.04]"
                data-osaka-demo-cancel
              >
                취소
              </button>
            ) : null}
            {onDismiss && (progress?.done || progress?.status === "error") ? (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full px-2 py-1 text-[11px] font-semibold text-[#8b95a1] hover:bg-black/[0.04]"
              >
                ✕
              </button>
            ) : null}
          </div>
        </header>

        <ol className="space-y-1">
          {OSAKA_30S_DEMO_STEPS.map((step, index) => {
            const done =
              progress != null &&
              (index < activeIndex ||
                (progress.done && index <= activeIndex) ||
                (awaiting && index < activeIndex));
            const active =
              (progress?.status === "running" && index === activeIndex) ||
              (awaiting && index === activeIndex);
            const justDone =
              progress?.status === "done" &&
              !progress.done &&
              index === activeIndex;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-1.5 text-[12px] tracking-tight",
                  active || justDone
                    ? "bg-[#0071e3]/[0.08] text-[#191f28]"
                    : done
                      ? "text-[#191f28]"
                      : "text-[#8b95a1]",
                )}
                data-osaka-demo-step={step.id}
                data-status={
                  active
                    ? awaiting
                      ? "awaiting"
                      : "running"
                    : done || justDone
                      ? "done"
                      : "pending"
                }
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    done || justDone
                      ? "bg-[#34c759] text-white"
                      : active
                        ? awaiting
                          ? "bg-[#ff9f0a] text-white"
                          : "bg-[#0071e3] text-white"
                        : "bg-[#f5f5f7] text-[#8b95a1]",
                  )}
                >
                  {done || justDone ? "✓" : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{step.labelKo}</span>
                  {active ? (
                    <span className="mt-0.5 block text-[10px] text-[#8b95a1]">
                      {step.hintKo}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>

        {reply ? (
          <p className="text-[11px] leading-snug text-[#515154]">{reply}</p>
        ) : null}
        {progress?.errorKo && progress.errorKo !== "cancelled" ? (
          <p className="text-[11px] font-semibold text-[#ff3b30]">
            지금은 이어서 못했어요
          </p>
        ) : null}
        {cancelled ? (
          <p className="text-[11px] font-semibold text-[#8b95a1]">
            데모를 취소했어요
          </p>
        ) : null}
        {progress?.done ? (
          <p className="text-[11px] font-semibold text-[#0071e3]">
            예약 완료 · 지도에 반영됐어요
          </p>
        ) : null}

        {awaiting || canContinue || canRewind ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {canRewind ? (
              <button
                type="button"
                onClick={onRewind}
                className="rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] font-semibold text-[#191f28]"
                data-osaka-demo-rewind
              >
                뒤로
              </button>
            ) : null}
            {canContinue ? (
              <button
                type="button"
                onClick={onContinue}
                className="rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] font-semibold text-[#191f28]"
                data-osaka-demo-continue
              >
                이어서
              </button>
            ) : null}
            {awaiting && onApprove ? (
              <button
                type="button"
                onClick={onApprove}
                disabled={approving}
                className="min-w-[5.5rem] flex-1 rounded-xl bg-[#1d1d1f] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
                data-osaka-demo-approve
              >
                {approving ? "반영 중…" : "승인"}
              </button>
            ) : null}
          </div>
        ) : null}
      </motion.section>
    </AnimatePresence>
  );
}
