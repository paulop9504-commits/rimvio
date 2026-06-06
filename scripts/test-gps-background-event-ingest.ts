import assert from "node:assert/strict";
import { detectGpsDwellClusters } from "@/lib/location-ping/detect-gps-dwell-clusters";
import { resetGpsPingStoreForTests } from "@/lib/location-ping/gps-ping-store";
import { resetGpsDwellIngestStoreForTests } from "@/lib/feed/gps-dwell-ingest-store";
import { ingestGpsDwellCluster } from "@/lib/feed/ingest-gps-dwell-to-feed";
import {
  resetEventCandidatesForTests,
  upsertEventCandidate,
} from "@/lib/events/event-store";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import type { GpsPing } from "@/lib/location-ping/types";

function jejuPings(): GpsPing[] {
  const base = Date.parse("2026-06-11T10:00:00+09:00");
  return [0, 12, 24, 36, 48].map((offsetMin, index) => ({
    id: `p${index}`,
    lat: 33.46 + index * 0.0002,
    lng: 126.31 + index * 0.0002,
    accuracyM: 12,
    capturedAtIso: new Date(base + offsetMin * 60_000).toISOString(),
    source: "periodic" as const,
  }));
}

function testDetectClosedCluster() {
  const pings = jejuPings();
  const clusters = detectGpsDwellClusters(
    pings,
    new Date(Date.parse("2026-06-11T11:30:00+09:00")),
  );
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]?.placeLabel, "제주");
  assert.ok((clusters[0]?.dwellMinutes ?? 0) >= 15);
}

function testIngestAttachesToPlanEvent() {
  resetGpsDwellIngestStoreForTests();
  const stamp = new Date().toISOString();
  resetEventCandidatesForTests();
  upsertEventCandidate({
    id: "jeju-plan",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: "2026-06-10T15:00:00+09:00",
    place: "제주",
    confidence: 0.9,
    metadata: {
      feedPlanEnabled: true,
      planWindowEndIso: "2026-06-12T19:00:00+09:00",
    },
    lifecycleUpdatedAt: stamp,
  });

  const clusters = detectGpsDwellClusters(
    jejuPings(),
    new Date(Date.parse("2026-06-11T11:30:00+09:00")),
  );
  const cluster = clusters[0];
  assert.ok(cluster);

  const result = ingestGpsDwellCluster(cluster);
  assert.equal(result.ingested, true);
  assert.equal(result.event?.id, "jeju-plan");
  assert.equal(result.createdNewEvent, false);
}

function testIngestCreatesEventWithoutPhoto() {
  resetGpsPingStoreForTests(jejuPings());
  resetGpsDwellIngestStoreForTests();
  resetEventCandidatesForTests();

  const clusters = detectGpsDwellClusters(
    jejuPings(),
    new Date(Date.parse("2026-06-11T11:30:00+09:00")),
  );
  const cluster = clusters[0];
  assert.ok(cluster);

  const result = ingestGpsDwellCluster(cluster);
  assert.equal(result.ingested, true);
  assert.ok(result.event);
  assert.equal(result.createdNewEvent, true);
  assert.equal(hasPendingFeedCaptureVerify(result.event), true);

  const again = ingestGpsDwellCluster(cluster);
  assert.equal(again.ingested, false);
}

testDetectClosedCluster();
testIngestAttachesToPlanEvent();
testIngestCreatesEventWithoutPhoto();
console.log("test-gps-background-event-ingest: ok");
