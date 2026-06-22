"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { verifySelectedGpsDwellSegments } from "@/lib/feed/verify-selected-gps-dwell-segments";
import { attachMatchingPoolMediaAfterSeal } from "@/lib/globe/passive-context/attach-matching-pool-media-after-seal";
import { markGlobeLocationConfirmed } from "@/lib/globe/globe-location-confirm-store";
import { projectGpsDwellConfirmDraft } from "@/lib/globe/gps-dwell/project-gps-dwell-confirm-segments";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioCompactPrimaryCtaClass,
  rimvioGhostCtaClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type GlobeDwellConfirmSheetProps = {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: (eventId: string) => void;
};

/** GPS dwell inbox confirm — time range, geocoded place, selective pin. */
export function GlobeDwellConfirmSheet({
  eventId,
  open,
  onOpenChange,
  onConfirmed,
}: GlobeDwellConfirmSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [placeEdits, setPlaceEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const draft = useMemo(() => {
    if (!open || !eventId?.trim()) {
      return null;
    }
    return projectGpsDwellConfirmDraft(findLifeEventCandidate(eventId.trim()));
  }, [eventId, open]);

  useEffect(() => {
    if (!draft) {
      setSelected({});
      setPlaceEdits({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const row of draft.segments) {
      next[row.fragmentId] = true;
    }
    setSelected(next);
    setPlaceEdits({});
  }, [draft?.eventId, draft?.segments.length]);

  const selectedIds = useMemo(
    () =>
      draft?.segments
        .filter((row) => selected[row.fragmentId])
        .map((row) => row.fragmentId) ?? [],
    [draft?.segments, selected],
  );

  const toggleSegment = useCallback((fragmentId: string) => {
    setSelected((prev) => ({
      ...prev,
      [fragmentId]: !prev[fragmentId],
    }));
  }, []);

  const onConfirm = useCallback(async () => {
    if (!draft || selectedIds.length === 0 || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await verifySelectedGpsDwellSegments({
        eventId: draft.eventId,
        segments: draft.segments,
        selectedFragmentIds: selectedIds,
        placeOverrides: placeEdits,
      });
      if (!result.ok || !result.event) {
        toast.error(copy.globe.dwellConfirmFail);
        return;
      }
      const place = result.event.place?.trim();
      if (place) {
        markGlobeLocationConfirmed(place, result.event.datetime);
      }
      void attachMatchingPoolMediaAfterSeal(result.event.id).then((count) => {
        if (count > 0) {
          toast.success(copy.globe.inboxLocationMediaAttached(count));
        }
      });
      toast.success(
        result.pinnedCount > 1
          ? copy.globe.dwellConfirmPinnedMany(result.pinnedCount)
          : copy.globe.dwellConfirmPinnedOne,
      );
      onConfirmed?.(result.event.id);
      onOpenChange(false);
    } catch {
      toast.error(copy.globe.dwellConfirmFail);
    } finally {
      setBusy(false);
    }
  }, [busy, draft, onConfirmed, onOpenChange, placeEdits, selectedIds]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && draft ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(rimvioSheetBackdropClass(), "z-[10080]")}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.dwellConfirmTitle}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={cn(rimvioBottomSheetClass(), "z-[10081]")}
            data-globe-dwell-confirm-sheet
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn("flex items-center gap-1.5", RIMVIO_TYPE.headline)}>
                    <MapPin className="size-4 text-primary" aria-hidden />
                    {copy.globe.dwellConfirmTitle}
                  </p>
                  <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
                    {copy.globe.dwellConfirmSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={rimvioSheetCloseBtnClass()}
                  aria-label={copy.globe.dwellConfirmCloseAria}
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-2.5">
                {draft.segments.map((row) => {
                  const checked = Boolean(selected[row.fragmentId]);
                  const placeValue =
                    placeEdits[row.fragmentId] ?? row.resolvedPlaceLabel;
                  return (
                    <li key={row.fragmentId}>
                      <button
                        type="button"
                        onClick={() => toggleSegment(row.fragmentId)}
                        className={cn(
                          rimvioSurfaceCardClass(
                            "w-full rounded-2xl p-3 text-left transition-colors",
                          ),
                          checked && "ring-2 ring-primary/35",
                        )}
                        data-globe-dwell-segment
                        data-globe-dwell-segment-selected={checked ? "1" : "0"}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-transparent",
                            )}
                            aria-hidden
                          >
                            <Check className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-foreground">
                              {row.timeRangeLabel}
                            </span>
                            <span className="mt-0.5 block text-[12px] text-muted-foreground">
                              {row.dwellLabel}
                              {row.geocoded
                                ? ` · ${copy.globe.dwellConfirmGeocodedHint}`
                                : ""}
                            </span>
                            <label
                              className="mt-2 block"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                {copy.globe.dwellConfirmPlaceLabel}
                              </span>
                              <input
                                value={placeValue}
                                onChange={(event) =>
                                  setPlaceEdits((prev) => ({
                                    ...prev,
                                    [row.fragmentId]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none ring-primary/30 focus:ring-2"
                                placeholder={copy.globe.dwellConfirmPlacePlaceholder}
                              />
                            </label>
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || selectedIds.length === 0}
                  onClick={() => void onConfirm()}
                  className={cn(rimvioCompactPrimaryCtaClass(), "flex-1")}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {copy.globe.dwellConfirmCta(selectedIds.length)}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onOpenChange(false)}
                  className={rimvioGhostCtaClass()}
                >
                  {copy.globe.inboxLocationDismiss}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
