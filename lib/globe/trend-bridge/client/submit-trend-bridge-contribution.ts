"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { loadTrendBridgeSettings } from "@/lib/globe/trend-bridge/trend-bridge-settings";

type FeedCapturePeek = {
  id?: string;
  capturedAtIso?: string;
};

function readLatestCapture(event: EventCandidate): FeedCapturePeek | null {
  const meta = event.metadata ?? {};
  const captures = meta.feedCaptures;
  if (!Array.isArray(captures) || captures.length === 0) {
    return null;
  }
  const last = captures[captures.length - 1] as FeedCapturePeek;
  return last ?? null;
}

/** Opt-in anonymous contribution after globe capture — only when 동네 맥락 is on. */
export async function submitTrendBridgeContributionFromEvent(input: {
  eventId: string;
  captureId?: string | null;
}): Promise<void> {
  const settings = loadTrendBridgeSettings();
  if (!settings.enabled || !settings.activeBridgeId?.trim()) {
    return;
  }

  const event = findEventCandidate(input.eventId.trim());
  if (!event) {
    return;
  }

  const coords = resolveEventGlobeCoords(event);
  const capture = readLatestCapture(event);
  const sourceCaptureId =
    input.captureId?.trim() ||
    capture?.id?.trim() ||
    `${event.id}:${capture?.capturedAtIso ?? event.datetime ?? "capture"}`;
  const captureAtIso =
    capture?.capturedAtIso?.trim() ||
    event.datetime?.trim() ||
    new Date().toISOString();
  const placeLabel = coords.placeLabel?.trim() || event.place?.trim() || "";
  if (!placeLabel) {
    return;
  }

  try {
    await fetch("/api/globe/trend-bridge/contribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bridgeId: settings.activeBridgeId,
        captureAtIso,
        placeLabel,
        sourceCaptureId,
        lat: coords.lat,
        lng: coords.lng,
      }),
    });
  } catch {
    // silent — contribution must not block capture UX
  }
}
