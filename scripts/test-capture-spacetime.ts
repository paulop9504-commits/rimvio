import assert from "node:assert/strict";
import { resetGpsPingStoreForTests } from "@/lib/location-ping/gps-ping-store";
import { resolveCaptureSpacetime } from "@/lib/location-ping/resolve-capture-spacetime";
import type { GpsPing } from "@/lib/location-ping/types";

function makePing(
  baseMs: number,
  offsetMinutes: number,
  lat: number,
  lng: number,
): GpsPing {
  const capturedAtIso = new Date(baseMs + offsetMinutes * 60_000).toISOString();
  return {
    id: `ping-${offsetMinutes}`,
    lat,
    lng,
    accuracyM: 12,
    capturedAtIso,
    source: "periodic",
  };
}

async function run() {
  const now = new Date("2026-06-03T12:00:00.000Z");
  const pings = [
    makePing(now.getTime(), -12, 33.4996, 126.5312),
    makePing(now.getTime(), -3, 33.5101, 126.5215),
    makePing(now.getTime(), 2, 37.5665, 126.978),
  ];
  resetGpsPingStoreForTests(pings);

  const file = {
    name: "jeju.jpg",
    type: "image/jpeg",
    lastModified: now.getTime() - 4 * 60_000,
    size: 1024,
  } as File;

  const resolved = await resolveCaptureSpacetime({
    file,
    pings,
    now,
  });

  assert.equal(resolved.resolveSource, "file_mtime");
  assert.equal(resolved.matchedPingId, "ping--3");
  assert.equal(resolved.lat, 33.5101);
  assert.equal(resolved.lng, 126.5215);

  const staleFile = {
    name: "old.jpg",
    type: "image/jpeg",
    lastModified: 0,
    size: 512,
  } as File;

  const fallback = await resolveCaptureSpacetime({
    file: staleFile,
    pings,
    now,
  });

  assert.equal(fallback.resolveSource, "last_known_ping");
  assert.equal(fallback.matchedPingId, "ping--3");

  console.log("test-capture-spacetime: ok");
}

void run();
