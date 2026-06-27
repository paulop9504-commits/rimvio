"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ImageIcon, Loader2, MapPin, Tag, X } from "lucide-react";
import { commitGlobePhotoIngestDraft } from "@/lib/globe/commit-globe-photo-ingest-draft";
import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import { stageGlobeMediaFilesToPool } from "@/lib/globe/stage-globe-media-to-pool";
import type { GlobeContextCandidateView } from "@/lib/globe/project-globe-context-candidate-view";
import { copy } from "@/lib/copy/human-ko";
import {
  rimvioBottomSheetClass,
  rimvioCompactPrimaryCtaClass,
  rimvioGhostCtaClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type GlobeContextConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: GlobePhotoIngestDraft | null;
  preparing?: boolean;
  prepareError?: string | null;
  onConfirmed?: (input: { eventId: string | null; toastLine: string }) => void;
};

function CandidateRow({ candidate }: { candidate: GlobeContextCandidateView }) {
  return (
    <div className={cn(rimvioSurfaceCardClass, "space-y-2.5 p-4")}>
      <p className="text-[17px] font-semibold tracking-tight text-foreground">
        {candidate.title}
      </p>
      <ul className="space-y-1.5 text-[14px] text-foreground/85">
        {candidate.placeLabel ? (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{candidate.placeLabel}</span>
          </li>
        ) : null}
        <li className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{candidate.dateLabel}</span>
        </li>
        <li className="flex items-start gap-2">
          <Tag className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{candidate.tagLabel}</span>
        </li>
        {candidate.fileCount > 1 ? (
          <li className="flex items-start gap-2">
            <ImageIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              {copy.globe.contextConfirmPhotoCount(candidate.fileCount)}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Photo-first context — inferred candidate, user confirms 예 / 나중에. */
export function GlobeContextConfirmSheet({
  open,
  onOpenChange,
  draft,
  preparing = false,
  prepareError = null,
  onConfirmed,
}: GlobeContextConfirmSheetProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback(() => {
    if (busy) {
      return;
    }
    onOpenChange(false);
  }, [busy, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    if (!draft || busy) {
      return;
    }
    setBusy(true);
    try {
      const summary = await commitGlobePhotoIngestDraft(draft);
      onConfirmed?.({
        eventId: summary.lastEventId,
        toastLine: summary.toastLine,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }, [busy, draft, onConfirmed, onOpenChange]);

  const handleLater = useCallback(async () => {
    if (!draft || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await stageGlobeMediaFilesToPool(draft.mediaFiles);
      onConfirmed?.({ eventId: null, toastLine: result.toastLine });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }, [busy, draft, onConfirmed, onOpenChange]);

  if (!mounted) {
    return null;
  }

  const multiCluster = (draft?.candidates.length ?? 0) > 1;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className={rimvioSheetBackdropClass()}
            aria-label={copy.globe.contextConfirmCloseAria}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(rimvioBottomSheetClass, "max-h-[min(88vh,640px)]")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            data-globe-context-confirm-sheet
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
              <div className="min-w-0">
                <p
                  id={titleId}
                  className="text-[12px] font-semibold uppercase tracking-wide text-primary"
                >
                  {copy.globe.contextConfirmEyebrow}
                </p>
                <h2 className="mt-1 text-[20px] font-bold tracking-tight text-foreground">
                  {preparing
                    ? copy.globe.contextConfirmPreparingTitle
                    : copy.globe.contextConfirmTitle}
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {preparing
                    ? copy.globe.contextConfirmPreparingBody
                    : multiCluster
                      ? copy.globe.contextConfirmMultiBody(
                          draft!.totalFiles,
                          draft!.candidates.length,
                        )
                      : copy.globe.contextConfirmBody}
                </p>
              </div>
              <button
                type="button"
                className={rimvioSheetCloseBtnClass()}
                aria-label={copy.globe.contextConfirmCloseAria}
                onClick={dismiss}
                disabled={busy}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
              {prepareError ? (
                <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
                  {prepareError}
                </p>
              ) : null}
              {preparing ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[14px] text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  {copy.globe.contextConfirmAnalyzing}
                </div>
              ) : null}
              {!preparing && draft
                ? draft.candidates.map((candidate) => (
                    <CandidateRow key={candidate.clusterId} candidate={candidate} />
                  ))
                : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-border/60 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                className={rimvioCompactPrimaryCtaClass()}
                disabled={preparing || busy || !draft || Boolean(prepareError)}
                onClick={() => void handleConfirm()}
                data-globe-context-confirm-yes
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {copy.globe.contextConfirmYes}
              </button>
              <button
                type="button"
                className={rimvioGhostCtaClass()}
                disabled={preparing || busy || !draft}
                onClick={() => void handleLater()}
                data-globe-context-confirm-later
              >
                {copy.globe.contextConfirmLater}
              </button>
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
