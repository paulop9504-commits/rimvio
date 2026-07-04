"use client";

import type { RefObject } from "react";
import { GlobeDiscoveryFeedStage } from "@/components/globe/globe-discovery-feed-stage";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { dispatchGlobeEateryFocus } from "@/lib/globe/eatery/globe-eatery-focus-bridge";
import type {
  GlobeEateryDiscoveryCard,
  GlobeEateryDiscoverySession,
} from "@/lib/globe/eatery/project-eatery-discovery-session";
import { copy } from "@/lib/copy/human-ko";

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
  activeResourceId?: string | null;
  className?: string;
};

/** Eatery discovery HUD — header, signal chips, ranked cards. */
export function GlobeEateryDiscoveryStage({
  session,
  globeRef,
  onDismiss,
  activeResourceId = null,
  className,
}: GlobeEateryDiscoveryStageProps) {
  const onCardPress = (card: GlobeEateryDiscoveryCard) => {
    globeRef?.current?.flyToPin(card.lat, card.lng, "street", { pinViewportY: 0.58 });
    dispatchGlobeEateryFocus({
      resourceId: card.resourceId,
      carouselIndex: card.rankIndex,
      source: "discovery_card",
    });
  };

  return (
    <GlobeDiscoveryFeedStage
      areaLabel={session.areaLabel}
      radiusM={session.radiusM}
      searching={session.searching}
      signalChips={session.signalChips}
      items={session.items}
      activeResourceId={activeResourceId}
      onItemPress={onCardPress}
      onDismiss={onDismiss}
      getItemMeta={(card) => {
        const distance = formatDistance(card.distanceM);
        return [card.providerLabel, distance, card.priceLabel].filter(Boolean).join(" · ") || null;
      }}
      radiusLabel={copy.globe.lodgingDiscoveryRadiusLabel}
      footerRadiusLabel={copy.globe.eateryDiscoveryFooterRadius}
      footerFoundLabel={copy.globe.eateryDiscoveryFooterFound}
      searchBadgeLabel={copy.globe.eateryDiscoverySearchBadge}
      searchingLabel={copy.globe.eateryDiscoveryChipSearching}
      closeAriaLabel={copy.globe.eateryDiscoveryCloseAria}
      dismissLabel={copy.globe.discoveryFeedDismissCta}
      accentGlowClassName="bg-[#ff9500] shadow-[0_0_8px_rgba(255,149,0,0.65)]"
      searchBadgeClassName="bg-[#ff9500]/20 text-[#ffc680]"
      dataAttrs={{
        stage: "data-globe-eatery-discovery-stage",
        header: "data-globe-eatery-discovery-header",
        chips: "data-globe-eatery-discovery-chips",
        cards: "data-globe-eatery-discovery-cards",
        footer: "data-globe-eatery-discovery-footer",
        card: "data-globe-eatery-discovery-card",
      }}
      className={className}
    />
  );
}
