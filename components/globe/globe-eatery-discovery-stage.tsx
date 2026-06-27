"use client";

import type { RefObject } from "react";
import { X } from "lucide-react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { dispatchGlobeEateryFocus } from "@/lib/globe/eatery/globe-eatery-focus-bridge";
import type {
  GlobeEateryDiscoveryCard,
  GlobeEateryDiscoverySession,
} from "@/lib/globe/eatery/project-eatery-discovery-session";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const ACCENT_DOT: Record<GlobeEateryDiscoveryCard["accent"], string> = {
  green: "bg-[#34c759]",
  blue: "bg-[#3182f6]",
  orange: "bg-[#ff9500]",
  purple: "bg-[#bf5af2]",
};

const ACCENT_RING: Record<GlobeEateryDiscoveryCard["accent"], string> = {
  green: "ring-[#34c759]/35",
  blue: "ring-[#3182f6]/35",
  orange: "ring-[#ff9500]/35",
  purple: "ring-[#bf5af2]/35",
};

function formatDistance(m: number | null): string | null {
  if (m == null || !Number.isFinite(m)) {
    return null;
  }
  if (m >= 1000) {
    return `${(m / 1000).toFixed(1)}km`;
  }
  return `${Math.round(m)}m`;
}

export type GlobeEateryDiscoveryStageProps = {
  session: GlobeEateryDiscoverySession;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  onDismiss: () => void;
  className?: string;
};

function DiscoveryCard({
  card,
  onPress,
}: {
  card: GlobeEateryDiscoveryCard;
  onPress: () => void;
}) {
  const distance = formatDistance(card.distanceM);
  const meta = [distance, card.priceLabel].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "flex min-w-[9.5rem] max-w-[10.5rem] shrink-0 flex-col rounded-[0.9rem] bg-[#1c1c1e]/92 p-2.5 text-left ring-1 backdrop-blur-md transition-transform active:scale-[0.98]",
        ACCENT_RING[card.accent],
      )}
      data-globe-eatery-discovery-card
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-white">
          {card.title}
        </p>
        <span className="flex shrink-0 items-baseline gap-0.5 text-white">
          <span className="text-[15px] font-bold leading-none">{card.score100}</span>
          <span className="text-[9px] font-medium text-white/55">/ 100</span>
        </span>
      </div>
      {meta ? (
        <p className="mt-1 text-[10px] font-medium text-white/65">{meta}</p>
      ) : null}
      <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-white/78">
        {card.detailReasonLine}
      </p>
      <span
        className={cn("mt-2 inline-flex size-1.5 rounded-full", ACCENT_DOT[card.accent])}
        aria-hidden
      />
    </button>
  );
}

/** Eatery discovery HUD — header, signal chips, ranked cards. */
export function GlobeEateryDiscoveryStage({
  session,
  globeRef,
  onDismiss,
  className,
}: GlobeEateryDiscoveryStageProps) {
  const onCardPress = (card: GlobeEateryDiscoveryCard) => {
    globeRef?.current?.flyToPin(card.lat, card.lng, "street", { pinViewportY: 0.58 });
    dispatchGlobeEateryFocus({
      resourceId: card.resourceId,
      carouselIndex: session.items.findIndex((row) => row.resourceId === card.resourceId),
      source: "discovery_card",
    });
  };

  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0 z-[28] flex flex-col", className)}
      data-globe-eatery-discovery-stage
    >
      <div
        className="pointer-events-auto mx-3 mt-[max(0.35rem,env(safe-area-inset-top))] flex items-center justify-between gap-2 rounded-[0.85rem] bg-[#121316]/88 px-3 py-2 ring-1 ring-white/10 backdrop-blur-xl"
        data-globe-eatery-discovery-header
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-[#ff9500] shadow-[0_0_8px_rgba(255,149,0,0.65)]" />
          <p className="truncate text-[12px] font-semibold text-white">{session.areaLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85">
            {copy.globe.lodgingDiscoveryRadiusLabel(session.radiusM)}
          </span>
          <span className="rounded-full bg-[#ff9500]/20 px-2 py-0.5 text-[10px] font-semibold text-[#ffc680]">
            {session.searching
              ? copy.globe.eateryDiscoveryChipSearching
              : copy.globe.eateryDiscoverySearchBadge}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white/80 active:bg-white/20"
            aria-label={copy.globe.eateryDiscoveryCloseAria}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className="pointer-events-auto mx-3 mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-globe-eatery-discovery-chips
      >
        {session.signalChips.map((chip) => (
          <span
            key={chip}
            className="shrink-0 rounded-full bg-[#121316]/78 px-2.5 py-1 text-[10px] font-medium text-white/82 ring-1 ring-white/10 backdrop-blur-md"
          >
            {chip}
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 flex flex-col"
        style={{
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.35rem)",
        }}
      >
        <div
          className="pointer-events-auto flex gap-2 overflow-x-auto px-3 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-globe-eatery-discovery-cards
        >
          {session.items.map((card) => (
            <DiscoveryCard key={card.resourceId} card={card} onPress={() => onCardPress(card)} />
          ))}
        </div>

        <div
          className="pointer-events-auto mx-3 flex items-center justify-between rounded-full bg-[#121316]/82 px-3 py-1.5 text-[10px] font-medium text-white/70 ring-1 ring-white/10 backdrop-blur-md"
          data-globe-eatery-discovery-footer
        >
          <span>{copy.globe.eateryDiscoveryFooterRadius(session.radiusM)}</span>
          <span>{copy.globe.eateryDiscoveryFooterFound(session.items.length)}</span>
        </div>
      </div>
    </div>
  );
}
