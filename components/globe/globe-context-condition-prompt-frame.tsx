"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { RefObject } from "react";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeContextConditionOrb } from "@/components/globe/globe-context-condition-orb";
import { GlobeContextConditionPinBar } from "@/components/globe/globe-context-condition-pin-bar";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import {
  readContextConditionLastBatch,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import { cn } from "@/lib/utils";

export type GlobeContextConditionPromptFrameProps = {
  open: boolean;
  event: EventCandidate | null;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  userLat?: number | null;
  userLng?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  onClose: () => void;
  className?: string;
};

/** Container AI surface — conversation + condition prompt (internal: Context Condition AI module). */
export function GlobeContextConditionPromptFrame({
  open,
  event,
  anchorPlaceId,
  anchorPlaceName,
  anchorLat,
  anchorLng,
  anchorPriceKrw = null,
  userLat = null,
  userLng = null,
  globeRef,
  onClose,
  className,
}: GlobeContextConditionPromptFrameProps) {
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const batch = readContextConditionLastBatch(event.id);
    setLastSummary(batch?.summaryKo ?? null);
  }, [event, open]);

  const travelLines = useMemo(() => {
    if (!event) {
      return [] as string[];
    }
    const state = buildTravelBrainState(event);
    return [
      state.slots.budget_band.reasonKo,
      state.slots.food_bias.reasonKo,
      state.slots.lodging_priority.reasonKo,
    ].filter(Boolean);
  }, [event]);

  const handlePinned = (outcome: ContextConditionAnchorPinOutcome) => {
    setLastSummary(outcome.summaryKo);
    if (outcome.pinPoints.length === 0) {
      return;
    }
    const bounds = computeLodgingDiscoveryBounds({
      user:
        userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null,
      lodging: outcome.pinPoints,
    });
    if (!bounds) {
      return;
    }
    globeRef?.current?.flyToDiscoveryBounds({
      centerLat: bounds.centerLat,
      centerLng: bounds.centerLng,
      altitude: bounds.altitude,
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
  };

  if (!open || !event) {
    return null;
  }

  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="context-condition-prompt"
      zIndex={34}
      dragLabel={copy.globe.contextConditionPanelDragLabel}
      className={cn(className)}
      shellClassName="overflow-hidden rounded-[1.15rem] bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06] backdrop-blur-xl"
      bodyClassName="flex min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-black/[0.05] px-3 py-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <GlobeContextConditionOrb size="md" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                {copy.globe.containerAiEyebrow}
              </p>
              <p className="truncate text-[14px] font-semibold text-[#1d1d1f]">
                {anchorPlaceName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[#515154] active:scale-95"
            aria-label={copy.globe.contextConditionPanelCloseAria}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3"
          data-globe-context-condition-conversation
        >
          <p className="text-[12px] leading-relaxed text-[#515154]">
            {copy.globe.contextConditionPanelHint}
          </p>
          {travelLines.length > 0 ? (
            <ul className="space-y-1.5">
              {travelLines.map((line) => (
                <li
                  key={line}
                  className="rounded-xl bg-[#f5f5f7] px-2.5 py-2 text-[11px] leading-relaxed text-[#515154]"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          {lastSummary ? (
            <p className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-900">
              {lastSummary}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-black/[0.05] px-3 py-2.5">
          <GlobeContextConditionPinBar
            contextEventId={event.id}
            anchorPlaceId={anchorPlaceId}
            anchorPlaceName={anchorPlaceName}
            anchorLat={anchorLat}
            anchorLng={anchorLng}
            anchorPriceKrw={anchorPriceKrw}
            onPinned={handlePinned}
          />
        </div>
      </div>
    </GlobeBrainSurfaceFloatingFrame>
  );
}
