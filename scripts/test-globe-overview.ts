#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildGlobeOverviewView } from "../lib/experience-graph/globe-overview-view";
import { globeViewForPinClusters } from "../lib/globe/project-pin-clusters";
import type { PinCluster } from "../lib/globe/pin-cluster-types";

const overview = buildGlobeOverviewView({ pinCount: 3 });
assert.ok(overview.zoom < 0.9, "overview should stay zoomed out");
assert.match(overview.placeLabel, /핀 3개/);

const cluster: PinCluster = {
  pinId: "pcluster:demo",
  eventId: "demo",
  title: "제주",
  placeLabel: "제주",
  lat: 33.389,
  lng: 126.553,
  dateLabel: "6월",
  startedAtIso: null,
  evidence: { photoCount: 1, videoCount: 0, chatCount: 0, placePinCount: 1 },
  recallLine: null,
};

const homeView = globeViewForPinClusters([cluster]);
assert.equal(homeView.zoom, overview.zoom);
assert.ok(Math.abs(homeView.lat - 12) < 0.01);

console.log("test-globe-overview: ok");
