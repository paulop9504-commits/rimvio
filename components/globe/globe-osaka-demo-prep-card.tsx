"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { OsakaDemoPrepCardV1 } from "@/lib/globe/osaka-demo/osaka-demo-theater";
import { cn } from "@/lib/utils";

export type GlobeOsakaDemoPrepCardProps = {
  readonly prep: OsakaDemoPrepCardV1 | null;
  readonly awaitingApprove?: boolean;
  readonly approving?: boolean;
  readonly onApprove?: () => void;
  readonly className?: string;
};

/** Scene 5–6 — bottom-right reserve prep + one-tap 승인. */
export function GlobeOsakaDemoPrepCard({
  prep,
  awaitingApprove = false,
  approving = false,
  onApprove,
  className,
}: GlobeOsakaDemoPrepCardProps) {
  return (
    <AnimatePresence>
      {prep ? (
        <motion.aside
          key="osaka-demo-prep"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          className={cn(
            "w-[min(100%,15.5rem)] space-y-2 rounded-2xl bg-[#1d1d1f]/94 px-3.5 py-3 text-white shadow-[0_14px_36px_rgba(0,0,0,0.28)] ring-1 ring-white/10",
            awaitingApprove ? "pointer-events-auto" : "pointer-events-none",
            className,
          )}
          data-globe-osaka-demo-prep-card
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold tracking-tight text-white/72">
            예약 준비 완료
          </p>
          <div className="space-y-0.5">
            <p className="text-[14px] font-bold tracking-tight">
              {prep.lodgingLabelKo}
            </p>
            <p className="text-[13px] font-semibold text-white/92">
              {prep.eateryLabelKo}
            </p>
            <p className="text-[12px] font-medium text-[#5ac8fa]">
              {prep.reserveAtLabelKo}
            </p>
          </div>
          {awaitingApprove && onApprove ? (
            <button
              type="button"
              onClick={onApprove}
              disabled={approving}
              className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#1d1d1f] disabled:opacity-60"
              data-osaka-demo-prep-approve
            >
              {approving ? "반영 중…" : "승인"}
            </button>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
