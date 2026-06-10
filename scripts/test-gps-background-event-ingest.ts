import assert from "node:assert/strict";
import { detectGpsDwellClusters } from "@/lib/location-ping/detect-gps-dwell-clusters";
import { resetGpsPingStoreForTests } from "@/lib/location-ping/gps-ping-store";
import { resetGpsDwellIngestStoreForTests } from "@/lib/feed/gps-dwell-ingest-store";
import { ingestGpsDwellCluster } from "@/lib/feed/ingest-gps-dwell-to-feed";
import {
  resetEventCandidatesForTests,
  upsertEventCandidate,
} from "@/lib/events/event-store";
import {
  appendFeedCaptureFragment,
  hasPendingFeedCaptureVerify,
  wasFeedCaptureHumanVerified,
} from "@/lib/feed/feed-capture-metadata";
import type { GpsDwellCluster } from "@/lib/location-ping/gps-dwell-cluster-types";
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

function testFollowUpDwellStaysVerifiedAfterHumanConfirm() {
  const stamp = new Date().toISOString();
  const verifiedMetadata = {
    targetingSource: "gps_background",
    feedCaptureVerifiedAt: stamp,
    feedCapturePendingVerify: false,
    feedCaptures: [
      {
        id: "gps-dwell:first",
        kind: "gps_dwell",
        capturedAtIso: "2026-06-06T10:00:00+09:00",
        autoAttached: true,
        verified: true,
        dwellMinutes: 129,
      },
    ],
  };

  assert.equal(wasFeedCaptureHumanVerified(verifiedMetadata), true);

  const followUpCluster: GpsDwellCluster = {
    id: "gps-dwell:follow-up:36300:127000",
    startIso: "2026-06-06T12:30:00+09:00",
    endIso: "2026-06-06T13:09:00+09:00",
    lat: 36.35,
    lng: 127.38,
    placeLabel: "둔산동",
    dwellMinutes: 39,
    pingCount: 5,
  };

  const humanVerified = wasFeedCaptureHumanVerified(verifiedMetadata);
  const metadata = {
    ...appendFeedCaptureFragment(verifiedMetadata, {
      id: followUpCluster.id,
      kind: "gps_dwell",
      capturedAtIso: followUpCluster.startIso,
      placeLabel: followUpCluster.placeLabel,
      label: `${followUpCluster.dwellMinutes}분`,
      dwellMinutes: followUpCluster.dwellMinutes,
      autoAttached: true,
      verified: humanVerified,
    }),
    feedCapturePendingVerify: humanVerified ? false : true,
  };

  assert.equal(hasPendingFeedCaptureVerify({ metadata } as import("../lib/events/event-candidate").EventCandidate), false);
}

testDetectClosedCluster();
testIngestAttachesToPlanEvent();
testIngestCreatesEventWithoutPhoto();
testFollowUpDwellStaysVerifiedAfterHumanConfirm();
console.log("test-gps-background-event-ingest: ok");
