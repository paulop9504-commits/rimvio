"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GlobeContextConditionOrb } from "@/components/globe/globe-context-condition-orb";
import { copy } from "@/lib/copy/human-ko";
import {
  clearContextConditionLastBatch,
  readContextConditionLastBatch,
  runContextConditionAnchorPin,
  dismissContextConditionPinBatch,
  type ContextConditionLastBatchWire,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
import { cn } from "@/lib/utils";

export type GlobeContextConditionPinBarProps = {
  contextEventId: string;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  onPinned?: (outcome: ContextConditionAnchorPinOutcome) => void;
  className?: string;
};

/** Context Condition AI — anchor bar: condition expression → immediate pins + batch dismiss. */
export function GlobeContextConditionPinBar({
  contextEventId,
  anchorPlaceId,
  anchorPlaceName,
  anchorLat,
  anchorLng,
  anchorPriceKrw = null,
  onPinned,
  className,
}: GlobeContextConditionPinBarProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastBatch, setLastBatch] = useState<ContextConditionLastBatchWire | null>(
    null,
  );

  useEffect(() => {
    setLastBatch(readContextConditionLastBatch(contextEventId));
  }, [contextEventId]);

  const handleSubmit = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const outcome = await runContextConditionAnchorPin({
        contextEventId,
        anchorPlaceId,
        anchorPlaceName,
        anchorLat,
        anchorLng,
        anchorPriceKrw,
        message: message.trim() || null,
      });
      if (!outcome) {
        toast.message(copy.globe.contextConditionPinEmpty);
        return;
      }
      const wire: ContextConditionLastBatchWire = {
        batchId: outcome.batchId,
        count: outcome.lodgingCount + outcome.eateryCount,
        summaryKo: outcome.summaryKo,
        atIso: new Date().toISOString(),
      };
      setLastBatch(wire);
      setMessage("");
      toast.success(outcome.summaryKo);
      onPinned?.(outcome);
    } finally {
      setBusy(false);
    }
  }, [
    anchorLat,
    anchorLng,
    anchorPlaceId,
    anchorPlaceName,
    anchorPriceKrw,
    busy,
    contextEventId,
    message,
    onPinned,
  ]);

  const handleDismissBatch = useCallback(() => {
    if (!lastBatch) {
      return;
    }
    dismissContextConditionPinBatch({
      contextEventId,
      batchId: lastBatch.batchId,
    });
    clearContextConditionLastBatch(contextEventId);
    setLastBatch(null);
  }, [contextEventId, lastBatch]);

  return (
    <div
      className={cn("space-y-2", className)}
      data-globe-context-condition-pin-bar
    >
      <div className="flex items-center gap-2 rounded-2xl bg-white/90 p-2 shadow-sm ring-1 ring-black/[0.04]">
        <GlobeContextConditionOrb size="sm" />
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={copy.globe.contextConditionPinPlaceholder}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none disabled:opacity-60"
          aria-label={copy.globe.contextConditionPinPlaceholder}
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy}
          className="shrink-0 rounded-full bg-[#1d1d1f] px-3 py-1.5 text-[12px] font-semibold text-white active:scale-[0.98] disabled:opacity-50"
        >
          {busy
            ? copy.globe.contextConditionPinBusy
            : copy.globe.contextConditionPinSubmit}
        </button>
      </div>

      {lastBatch ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-[11px] font-medium text-[#515154]">
            {lastBatch.summaryKo}
          </p>
          <button
            type="button"
            onClick={handleDismissBatch}
            className="shrink-0 text-[11px] font-semibold text-[#ff6b4a] active:opacity-70"
          >
            {copy.globe.contextConditionPinDismiss}
          </button>
        </div>
      ) : null}
    </div>
  );
}
