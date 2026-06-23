"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { upsertPersonalGlobePin } from "@/lib/globe/personal-globe-pin-store";
import { sampleEphemeralGpsPlace } from "@/lib/globe/sample-ephemeral-gps-place";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type MarketIntentGlobePinAnchor = {
  lat: number;
  lng: number;
  placeLabel: string;
  gpsSampled: boolean;
};

function hasTradeAnchor(record: MarketIntentRecord): boolean {
  return (
    Number.isFinite(record.anchorLat) &&
    Number.isFinite(record.anchorLng) &&
    record.anchorLat !== 0 &&
    record.anchorLng !== 0 &&
    Boolean(record.placeLabel?.trim())
  );
}

/** @중고 confirm — trade anchor → grey market pin (GPS only if unset). */
export async function syncMarketIntentGlobePin(
  record: MarketIntentRecord,
): Promise<MarketIntentGlobePinAnchor> {
  let lat = record.anchorLat;
  let lng = record.anchorLng;
  let placeLabel = record.placeLabel?.trim() || "";
  let gpsSampled = false;

  if (!hasTradeAnchor(record)) {
    const gps = await sampleEphemeralGpsPlace();
    gpsSampled = Boolean(gps);
    lat =
      gps?.lat ??
      (Number.isFinite(record.anchorLat) && record.anchorLat !== 0
        ? record.anchorLat
        : 37.5665);
    lng =
      gps?.lng ??
      (Number.isFinite(record.anchorLng) && record.anchorLng !== 0
        ? record.anchorLng
        : 126.978);
    placeLabel = gps?.placeLabel?.trim() || record.placeLabel?.trim() || "근처";
  }

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
