#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  filterPersonalGlobeClusters,
  projectDiscoveryGlobeClusters,
  resolveGlobeClustersForLayerMode,
} from "../lib/globe/filter-globe-clusters-by-layer-mode";
import { isExternalPinCluster } from "../lib/globe/merge-globe-pin-clusters";
import type { PinCluster } from "../lib/globe/pin-cluster-types";

const personalPin: PinCluster = {
  pinId: "pgpin:evt-1",
  eventId: "evt-1",
  title: "내 흔적",
  placeLabel: "서울",
  lat: 37.5665,
  lng: 126.978,
  dateLabel: null,
  startedAtIso: "2026-01-01T00:00:00.000Z",
  evidence: { photoCount: 1, videoCount: 0, chatCount: 0, placePinCount: 1 },
  recallLine: null,
};

const marketPin: PinCluster = {
  ...personalPin,
  pinId: "pgpin:market-1",
  eventId: "market-1",
  title: "내놓는 중",
  marketRole: "listing",
};

const ghostPin: PinCluster = {
  ...personalPin,
  pinId: "ghost:bridge-1",
  eventId: "bridge-1",
  variant: "bridge_ghost",
};

const filtered = filterPersonalGlobeClusters([personalPin, marketPin, ghostPin]);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]?.eventId, "evt-1");

const discovery = projectDiscoveryGlobeClusters({
  externalTraces: [
    {
      traceId: "t1",
      eventId: "e-other",
      title: "도쿄 골목",
      placeLabel: "시부야",
      lat: 35.66,
      lng: 139.7,
      authorUserId: "user-other",
      authorDisplayName: "여행者",
      photoCount: 2,
      videoCount: 0,
      startedAtIso: "2026-01-01T00:00:00.000Z",
      recallLine: "밤에 걸어보세요",
      pioneerCell: null,
    },
  ],
});
assert.equal(discovery.length, 1);
assert.ok(isExternalPinCluster(discovery[0]));

const personalLayer = resolveGlobeClustersForLayerMode({
  mode: "personal",
  personalClusters: [personalPin, marketPin],
  bridgeGhostClusters: [ghostPin],
});
assert.equal(personalLayer.length, 2);
assert.ok(personalLayer.some((row) => row.variant === "bridge_ghost"));
assert.ok(!personalLayer.some((row) => row.marketRole));

const discoveryLayer = resolveGlobeClustersForLayerMode({
  mode: "discovery",
  personalClusters: [personalPin, marketPin],
  externalTraces: [
    {
      traceId: "t1",
      eventId: "e-other",
      title: "도쿄 골목",
      placeLabel: "시부야",
      lat: 35.66,
      lng: 139.7,
      authorUserId: "user-other",
      authorDisplayName: null,
      photoCount: 2,
      videoCount: 0,
      startedAtIso: "2026-01-01T00:00:00.000Z",
      recallLine: null,
      pioneerCell: null,
    },
  ],
});
assert.equal(discoveryLayer.length, 1);
assert.equal(discoveryLayer[0]?.origin, "external");

console.log("test-globe-layer-mode: ok");
