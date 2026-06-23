import { copy } from "@/lib/copy/human-ko";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketVolumeZoneResult } from "@/lib/globe/market/price-guide/resolve-market-volume-zone";

export type MarketVolumeZoneCopy = {
  eyebrow: string;
  tierLine: string;
  body: string;
  priceHint: string | null;
  disclaimer: string;
};

export function formatMarketVolumeZoneCopy(
  zone: MarketVolumeZoneResult,
  role: MarketIntentRole,
): MarketVolumeZoneCopy | null {
  if (!zone.available || zone.batteryPercent === null || !zone.batteryTierLabelKo) {
    return null;
  }

  const tierLine = copy.globe.marketVolumeZoneTierLabel(
    zone.batteryTierLabelKo,
    zone.batteryPercent,
  );

  const body =
    zone.confidence === "realized" && zone.sampleCount >= 2
      ? role === "seeking"
        ? copy.globe.marketVolumeZoneSeekingBodyRealized(
            zone.bandMinMan,
            zone.bandMaxMan,
            zone.sampleCount,
          )
        : copy.globe.marketVolumeZoneListingBodyRealized(
            zone.anchorMan,
            zone.bandMinMan,
            zone.bandMaxMan,
            zone.sampleCount,
          )
      : role === "seeking"
        ? copy.globe.marketVolumeZoneSeekingBody(zone.bandMinMan, zone.bandMaxMan)
        : copy.globe.marketVolumeZoneListingBody(
            zone.anchorMan,
            zone.bandMinMan,
            zone.bandMaxMan,
          );

  let priceHint: string | null = null;
  if (zone.userPriceMan !== null && zone.pricePosition) {
    if (zone.pricePosition === "below") {
      priceHint = copy.globe.marketVolumeZonePriceBelow(
        zone.userPriceMan,
        zone.bandMinMan,
      );
    } else if (zone.pricePosition === "in_zone") {
      priceHint = copy.globe.marketVolumeZonePriceInZone(zone.userPriceMan);
    } else {
      priceHint = copy.globe.marketVolumeZonePriceAbove(
        zone.userPriceMan,
        zone.bandMaxMan,
      );
    }
  }

  return {
    eyebrow: copy.globe.marketVolumeZoneEyebrow,
    tierLine,
    body,
    priceHint,
    disclaimer:
      zone.confidence === "realized"
        ? copy.globe.marketVolumeZoneRealizedDisclaimer(zone.sampleCount)
        : copy.globe.marketVolumeZoneSeedDisclaimer,
  };
}
