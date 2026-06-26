"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { resolveMarketIntentPinAnchor } from "@/lib/globe/market/resolve-market-intent-pin-anchor";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { upsertPersonalGlobePin } from "@/lib/globe/personal-globe-pin-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type MarketIntentGlobePinAnchor = {
  lat: number;
  lng: number;
  placeLabel: string;
  gpsSampled: boolean;
};

/** @중고 confirm — pin at live GPS; place label stays chosen 구 when set. */
export async function syncMarketIntentGlobePin(
  record: MarketIntentRecord,
): Promise<MarketIntentGlobePinAnchor> {
  const anchor = await resolveMarketIntentPinAnchor({
    placeLabel: record.placeLabel,
    anchorLat: record.anchorLat,
    anchorLng: record.anchorLng,
  });

  const { lat, lng, placeLabel, gpsSampled } = anchor;

  const event = findEventCandidate(record.eventId);
  if (event) {
    commitEventUpsert({
      ...event,
      place: placeLabel,
      metadata: {
        ...(event.metadata ?? {}),
        globePlaceConfirmed: true,
        globePlaceLat: lat,
        globePlaceLng: lng,
        globePlaceLabel: placeLabel,
        globePlaceCardLat: lat,
        globePlaceCardLng: lng,
        globePlaceCardLabel: placeLabel,
      },
    });
  }

  const title =
    record.detail?.productName?.trim() ||
    record.title.trim() ||
    (record.role === "listing" ? "내놓는 중" : "구하는 중");

  const pin: PersonalGlobePin = {
    pinId: `pgpin:${record.eventId}`,
    eventId: record.eventId,
    lat,
    lng,
    placeLabel,
    experienceTitle: title,
    photoCount: record.detail?.photoCount ?? 0,
    videoCount: 0,
    createdAtIso: record.confirmedAtIso,
    acl: { viewerPeerThreadIds: [] },
    marketRole: record.role,
  };

  upsertPersonalGlobePin(pin);

  return { lat, lng, placeLabel, gpsSampled };
}
