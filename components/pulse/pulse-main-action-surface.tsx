"use client";

import { useCallback } from "react";
import { PulseMainActionCard } from "@/components/pulse/pulse-main-action-card";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import type { PulseMainActionOffer } from "@/lib/globe/trend-bridge/resolve-pulse-main-action";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { usePulseMainAction } from "@/hooks/use-pulse-main-action";
import { useTrendBridge } from "@/hooks/use-trend-bridge";

export type PulseMainActionSurfaceProps = {
  enabled: boolean;
  anchorLat?: number | null;
  anchorLng?: number | null;
  className?: string;
};

/** Shared Pulse MAIN — globe, stack, feed. */
export function PulseMainActionSurface({
  enabled,
  anchorLat,
  anchorLng,
  className,
}: PulseMainActionSurfaceProps) {
  const liveLocation = useLiveLocationSnapshot();
  const { settings } = useTrendBridge();
  const lat = anchorLat ?? liveLocation?.lat ?? null;
  const lng = anchorLng ?? liveLocation?.lng ?? null;

  const pulseMainAction = usePulseMainAction({
    enabled,
    anchorLat: lat,
    anchorLng: lng,
    pulseIntent: settings.pulseIntent,
  });

  const onPrimary = useCallback((offer: PulseMainActionOffer) => {
    if (offer.primaryKind === "schedule" && offer.scheduleHref) {
      window.open(offer.scheduleHref, "_blank", "noopener,noreferrer");
      return;
    }
    openHrefWithFallback(offer.navigateHref, offer.navigateWebHref);
  }, []);

  const onSecondary = useCallback((offer: PulseMainActionOffer) => {
    if (offer.secondaryKind === "schedule" && offer.scheduleHref) {
      window.open(offer.scheduleHref, "_blank", "noopener,noreferrer");
      return;
    }
    if (offer.secondaryKind === "navigate") {
      openHrefWithFallback(offer.navigateHref, offer.navigateWebHref);
    }
  }, []);

  if (!enabled && !pulseMainAction.loading && !pulseMainAction.offer) {
    return null;
  }

  return (
    <PulseMainActionCard
      className={className}
      offer={pulseMainAction.offer}
      loading={pulseMainAction.loading}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      onDismiss={pulseMainAction.dismiss}
    />
  );
}
