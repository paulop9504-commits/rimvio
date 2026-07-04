"use client";

import type { RefObject } from "react";
import { GlobeDiscoveryFeedStage } from "@/components/globe/globe-discovery-feed-stage";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { dispatchGlobeLodgingFocus } from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import type {
  GlobeLodgingDiscoveryCard,
  GlobeLodgingDiscoverySession,
} from "@/lib/globe/lodging/project-lodging-discovery-session";
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

function formatPricePerNight(krw: number | null): string | null {
  if (krw == null || !Number.isFinite(krw)) {
    return null;
  }
  return `₩${Math.round(krw).toLocaleString("ko-KR")}/박`;
}

export type GlobeLodgingDiscoveryStageProps = {
  session: GlobeLodgingDiscoverySession;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  onDismiss: () => void;
  activeResourceId?: string | null;
  className?: string;
};

/** Lodging discovery HUD — header, signal chips, ranked cards. */
export function GlobeLodgingDiscoveryStage({
  session,
  globeRef,
  onDismiss,
  activeResourceId = null,
  className,
}: GlobeLodgingDiscoveryStageProps) {
  const onCardPress = (card: GlobeLodgingDiscoveryCard) => {
    globeRef?.current?.flyToPin(card.lat, card.lng, "street", { pinViewportY: 0.58 });
    dispatchGlobeLodgingFocus({
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
        const price = formatPricePerNight(card.priceKrw);
        return [distance, price].filter(Boolean).join(" · ") || null;
      }}
      getItemSecondaryLine={(card) => card.addressLine}
      getItemAction={(card) => ({
        label: copy.globe.eateryFocusNavigate,
        href: card.navigationHref,
      })}
      radiusLabel={copy.globe.lodgingDiscoveryRadiusLabel}
      footerRadiusLabel={copy.globe.lodgingDiscoveryFooterRadius}
      footerFoundLabel={copy.globe.lodgingDiscoveryFooterFound}
      searchBadgeLabel={copy.globe.lodgingDiscoverySearchBadge}
      searchingLabel={copy.globe.lodgingDiscoveryChipSearching}
      closeAriaLabel={copy.globe.lodgingDiscoveryCloseAria}
      dismissLabel={copy.globe.discoveryFeedDismissCta}
      accentGlowClassName="bg-[#34c759] shadow-[0_0_8px_rgba(52,199,89,0.65)]"
      searchBadgeClassName="bg-[#3182f6]/20 text-[#7eb8ff]"
      dataAttrs={{
        stage: "data-globe-lodging-discovery-stage",
        header: "data-globe-lodging-discovery-header",
        chips: "data-globe-lodging-discovery-chips",
        cards: "data-globe-lodging-discovery-cards",
        footer: "data-globe-lodging-discovery-footer",
        card: "data-globe-lodging-discovery-card",
      }}
      className={className}
    />
  );
}
