import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import { requestGpsBurst } from "@/lib/location-ping/gps-burst-sample";
import {
  GPS_PINGS_UPDATED,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";
import {
  GPS_TRACKING_UPDATED,
  isGpsTrackingEnabled,
} from "@/lib/location-ping/gps-tracking-settings";
import {
  projectLiveLocationSnapshot,
  type LiveLocationSnapshot,
} from "@/lib/location-ping/project-live-location-snapshot";

export type LiveLocationPowerMode = "high" | "balanced" | "saver";

const SAVER_POLL_MS = 5 * 60_000;

type Listener = (snapshot: LiveLocationSnapshot | null) => void;

let listeners = new Set<Listener>();
let pollId: ReturnType<typeof setInterval> | null = null;
let powerMode: LiveLocationPowerMode = "saver";
let snapshot: LiveLocationSnapshot | null = null;
let started = false;

function formatTimeLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "지금";
  }
  return new Date(ms).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function publishFromCoords(input: {
  lat: number;
  lng: number;
  accuracyM: number | null;
  capturedAtIso: string;
  contextLabel?: string;
}) {
  const next: LiveLocationSnapshot = {
    lat: input.lat,
    lng: input.lng,
    accuracyM: input.accuracyM,
    capturedAtIso: input.capturedAtIso,
    placeLabel: resolvePlaceLabelNearCoords(input.lat, input.lng),
    contextLabel: input.contextLabel ?? "현재 위치",
    timeLabel: formatTimeLabel(input.capturedAtIso),
  };
  snapshot = next;
  for (const listener of listeners) {
    listener(next);
  }
}

async function refreshFromStore() {
  if (!isGpsTrackingEnabled()) {
    snapshot = null;
    for (const listener of listeners) {
      listener(null);
    }
    return;
  }
  const pings = await listRecentGpsPings();
  const next = projectLiveLocationSnapshot(pings);
  if (next) {
    snapshot = next;
    for (const listener of listeners) {
      listener(next);
    }
    return;
  }
  snapshot = null;
  for (const listener of listeners) {
    listener(null);
  }
}

async function pollOnce() {
  if (!isGpsTrackingEnabled()) {
    snapshot = null;
    for (const listener of listeners) {
      listener(null);
    }
    return;
  }

  await refreshFromStore();
  if (snapshot) {
    return;
  }

  if (
    typeof document !== "undefined" &&
    document.visibilityState !== "visible"
  ) {
    return;
  }

  const tier = powerMode === "high" ? "active" : "passive";
  const ping = await requestGpsBurst({
    reason: "live_refresh",
    tier,
    force: powerMode === "high",
  });
  if (!ping) {
    return;
  }
  publishFromCoords({
    lat: ping.lat,
    lng: ping.lng,
    accuracyM: ping.accuracyM,
    capturedAtIso: ping.capturedAtIso,
    contextLabel: snapshot?.contextLabel,
  });
}

function stopPoll() {
  if (pollId != null) {
    clearInterval(pollId);
    pollId = null;
  }
}

function startPoll() {
  stopPoll();
  if (!isGpsTrackingEnabled()) {
    snapshot = null;
    for (const listener of listeners) {
      listener(null);
    }
    return;
  }

  void pollOnce();
  pollId = setInterval(() => {
    void pollOnce();
  }, SAVER_POLL_MS);
}

function syncTracking() {
  startPoll();
}

function ensureStarted() {
  if (started) {
    return;
  }
  started = true;
  void refreshFromStore();
  syncTracking();
  window.addEventListener(GPS_TRACKING_UPDATED, syncTracking);
  window.addEventListener(GPS_PINGS_UPDATED, refreshFromStore);
}

export function getLiveLocationSnapshot(): LiveLocationSnapshot | null {
  return snapshot;
}

/** UI-only hint — never starts watchPosition; burst scheduler owns sampling. */
export function setLiveLocationPowerMode(mode: LiveLocationPowerMode) {
  if (powerMode === mode) {
    return;
  }
  powerMode = mode;
  if (started) {
    syncTracking();
  }
}

export function subscribeLiveLocation(listener: Listener): () => void {
  ensureStarted();
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopPoll();
      started = false;
      window.removeEventListener(GPS_TRACKING_UPDATED, syncTracking);
      window.removeEventListener(GPS_PINGS_UPDATED, refreshFromStore);
    }
  };
}

/** Test-only reset. */
export function resetLiveLocationServiceForTests(): void {
  stopPoll();
  listeners = new Set();
  snapshot = null;
  powerMode = "saver";
  started = false;
}
