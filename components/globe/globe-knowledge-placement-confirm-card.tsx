"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import {
  confirmKnowledgePlacementCapture,
  dismissKnowledgePlacementCapture,
} from "@/lib/globe/confirm-knowledge-placement-capture";
import type { GlobeKnowledgePlacementPending } from "@/lib/globe/globe-knowledge-placement-pending";
import { cn } from "@/lib/utils";

export type GlobeKnowledgePlacementConfirmCardProps = {
  pending: GlobeKnowledgePlacementPending;
  className?: string;
  onDismiss?: () => void;
  onConfirmed?: (input: { anchorEventId: string; knowledgeBoxLabel: string }) => void;
};

/** Capture upload — offer placing insurance docs into knowledge box (user confirm only). */
export function GlobeKnowledgePlacementConfirmCard({
  pending,
  className,
  onDismiss,
  onConfirmed,
}: GlobeKnowledgePlacementConfirmCardProps) {
  const [busy, setBusy] = useState(false);
  const { suggestion } = pending;

  const onConfirm = useCallback(() => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const result = confirmKnowledgePlacementCapture(pending);
      if (!result.ok) {
        toast.error(copy.globe.knowledgePlacementConfirmFail);
        return;
      }
      toast.success(copy.globe.knowledgePlacementConfirmedToast(result.knowledgeBoxLabel));
      onConfirmed?.({
        anchorEventId: result.anchorEventId,
        knowledgeBoxLabel: result.knowledgeBoxLabel,
      });
      onDismiss?.();
    } finally {
      setBusy(false);
    }
  }, [busy, onConfirmed, onDismiss, pending]);

  const onSkip = useCallback(() => {
    dismissKnowledgePlacementCapture();
    onDismiss?.();
  }, [onDismiss]);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.35rem] bg-white/94 p-4 shadow-[0_8px_32px_rgba(2,32,71,0.14)] ring-1 ring-black/[0.06] backdrop-blur-xl",
        className,
      )}
      data-globe-knowledge-placement-confirm
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
        {copy.globe.knowledgePlacementEyebrow}
      </p>
      <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">
        {copy.globe.knowledgePlacementTitle(
          suggestion.knowledgeBoxLabel,
          suggestion.anchorTitle,
        )}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">{suggestion.reasonKo}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-primary py-2.5 text-[13px] font-bold text-primary-foreground active:opacity-90 disabled:opacity-60"
        >
          {copy.globe.knowledgePlacementConfirm}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="flex-1 rounded-xl bg-muted py-2.5 text-[13px] font-semibold text-muted-foreground active:opacity-90 disabled:opacity-60"
        >
          {copy.globe.knowledgePlacementDismiss}
        </button>
      </div>
    </section>
  );
}
