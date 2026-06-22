"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import { advanceEventLifecycle } from "@/lib/events/event-lifecycle";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  applySelectedGpsDwellFragmentVerify,
  hasPendingFeedCaptureVerify,
  readDwellMinutesFromCaptures,
} from "@/lib/feed/feed-capture-metadata";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import { createPersonalGlobePinFromDwellSegment } from "@/lib/globe/create-personal-globe-pin-from-dwell-segment";
import { geocodeAndSyncGlobeContextPlace } from "@/lib/globe/geocode-and-sync-globe-context-place";
import type { GpsDwellConfirmSegment } from "@/lib/globe/gps-dwell/project-gps-dwell-confirm-segments";
import { sealVerifiedPassiveContext } from "@/lib/globe/passive-context/seal-verified-passive-context";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { VerifyFeedCaptureResult } from "@/lib/feed/verify-feed-capture";

function toLocalEventIso(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return iso;
  }
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

function pickPrimarySegment(
  segments: readonly GpsDwellConfirmSegment[],
): GpsDwellConfirmSegment | null {
  if (segments.length === 0) {
    return null;
  }
  return [...segments].sort((left, right) => right.dwellMinutes - left.dwellMinutes)[0]!;
}

function resolveGpsDwellEventTitle(place: string, totalMinutes: number): string {
  if (place.includes("°")) {
    return formatDwellMinutesLabel(totalMinutes);
  }
  return `${place} · ${formatDwellMinutesLabel(totalMinutes)}`;
}

export type VerifySelectedGpsDwellInput = {
  eventId: string;
  segments: readonly GpsDwellConfirmSegment[];
  selectedFragmentIds: readonly string[];
  placeOverrides?: Readonly<Record<string, string>>;
};

/** Selective dwell confirm — time range + geocoded place → globe pins. */
export async function verifySelectedGpsDwellSegments(
  input: VerifySelectedGpsDwellInput,
): Promise<VerifyFeedCaptureResult & { pinnedCount: number }> {
  const id = input.eventId.trim();
  const selectedIds = input.selectedFragmentIds.map((row) => row.trim()).filter(Boolean);
  if (!id || selectedIds.length === 0) {
    return { ok: false, event: null, alreadyVerified: false, pinnedCount: 0 };
  }

  const existing = findEventCandidate(id);
  if (!existing) {
    return { ok: false, event: null, alreadyVerified: false, pinnedCount: 0 };
  }

  if (!hasPendingFeedCaptureVerify(existing)) {
    return { ok: true, event: existing, alreadyVerified: true, pinnedCount: 0 };
  }

  const selected = input.segments.filter((row) => selectedIds.includes(row.fragmentId));
  if (selected.length === 0) {
    return { ok: false, event: null, alreadyVerified: false, pinnedCount: 0 };
  }

  const primary = pickPrimarySegment(selected)!;
  const placeOverrides = input.placeOverrides ?? {};
  const resolvedSelected = selected.map((row) => {
    const override = normalizePlaceLabel(placeOverrides[row.fragmentId] ?? "");
    return {
      ...row,
      resolvedPlaceLabel: override || row.resolvedPlaceLabel,
    };
  });

  let lifecycle = existing.lifecycle;
  if (lifecycle === "mentioned" || lifecycle === "candidate") {
    lifecycle = advanceEventLifecycle(existing, "confirmed").lifecycle;
  }

  const primaryPlace = resolvedSelected.find((row) => row.fragmentId === primary.fragmentId)
    ?.resolvedPlaceLabel ?? primary.resolvedPlaceLabel;

  const metadata = applySelectedGpsDwellFragmentVerify(existing.metadata, selectedIds);
  const totalDwellMinutes = readDwellMinutesFromCaptures({
    ...existing,
    metadata,
  } as EventCandidate);

  let saved = commitEventUpsert({
    id: existing.id,
    title: resolveGpsDwellEventTitle(
      primaryPlace,
      totalDwellMinutes ?? primary.dwellMinutes,
    ),
    category: existing.category,
    source: existing.source,
    lifecycle,
    datetime: toLocalEventIso(primary.startIso),
    place: primaryPlace.includes("°") ? undefined : primaryPlace,
    containerId: existing.containerId,
    confidence: Math.min(0.95, existing.confidence + 0.06),
    metadata: {
      ...metadata,
      gpsDwellLat: primary.lat,
      gpsDwellLng: primary.lng,
      gpsDwellPlaceLabel: primaryPlace,
      gpsDwellMinutes: totalDwellMinutes ?? primary.dwellMinutes,
      globePlaceLat: primary.lat,
      globePlaceLng: primary.lng,
      globePlaceConfirmed: true,
    },
    lifecycleUpdatedAt: existing.lifecycleUpdatedAt,
  });

  const usePrimaryPinId = resolvedSelected.length === 1;
  for (const row of resolvedSelected) {
    createPersonalGlobePinFromDwellSegment({
      event: saved,
      fragmentId: row.fragmentId,
      lat: row.lat,
      lng: row.lng,
      placeLabel: row.resolvedPlaceLabel,
      startIso: row.startIso,
      dwellMinutes: row.dwellMinutes,
      usePrimaryPinId,
    });
  }

  if (!hasPendingFeedCaptureVerify(saved)) {
    saved = sealVerifiedPassiveContext(saved);
  }

  const geocodePlace = saved.place?.trim() || primaryPlace;
  if (geocodePlace && !geocodePlace.includes("°")) {
    await geocodeAndSyncGlobeContextPlace({
      eventId: saved.id,
      placeLabel: geocodePlace,
      title: saved.title,
      userLat: primary.lat,
      userLng: primary.lng,
    });
    const refreshed = findEventCandidate(saved.id);
    if (refreshed) {
      saved = refreshed;
    }
  }

  return {
    ok: true,
    event: saved,
    alreadyVerified: false,
    pinnedCount: resolvedSelected.length,
  };
}
