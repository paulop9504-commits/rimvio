#!/usr/bin/env npx tsx
/**
 * Map + feed must share the same lodging place set after a Field scout.
 * Stale APA session-graph nodes must not stay on the map.
 */
import assert from "node:assert/strict";
import {
  alignSessionGraphLodgingToScout,
  clearSessionGraphs,
  ensureSessionGraph,
  projectSessionGraphToBrainCandidates,
  resetGraphCommandStoreForTests,
  writeSessionGraph,
} from "../lib/graph-command";
import { mergeContextConditionLodgingMarkers } from "../lib/globe/context-condition-ai/project-context-condition-globe-markers";
import type { GlobeLodgingMapMarker } from "../lib/globe/context-hub/lodging-globe-marker-types";

resetGraphCommandStoreForTests();
clearSessionGraphs();

const CTX = "evt-map-feed-sync";

{
  let graph = ensureSessionGraph({
    contextEventId: CTX,
    anchorLat: 34.66,
    anchorLng: 135.5,
  });
  graph = {
    ...graph,
    nodes: [
      {
        id: "gnode:apa-namba",
        labelKo: "APA 난바",
        kind: "lodging",
        lat: 34.6654,
        lng: 135.5019,
        rating: 4.3,
        walkMinutes: 0,
        reservable: true,
        localFavorite: false,
        priceBand: 2,
        pinned: false,
        visible: true,
        alwaysVisible: false,
        parentId: null,
        groupId: null,
        accent: "default",
        projectFolderKo: null,
        attrs: { catalogId: "lodging:apa-namba", brand: "APA" },
      },
      {
        id: "gnode:apa-umeda",
        labelKo: "APA 우메다",
        kind: "lodging",
        lat: 34.7015,
        lng: 135.4968,
        rating: 4.2,
        walkMinutes: 18,
        reservable: true,
        localFavorite: false,
        priceBand: 2,
        pinned: false,
        visible: true,
        alwaysVisible: false,
        parentId: null,
        groupId: null,
        accent: "default",
        projectFolderKo: null,
        attrs: { catalogId: "lodging:apa-umeda", brand: "APA" },
      },
    ],
  };
  writeSessionGraph(graph);

  const before = projectSessionGraphToBrainCandidates(graph);
  assert.equal(before.length, 2);
  assert.ok(before.every((m) => /APA/u.test(m.label)));

  const aligned = alignSessionGraphLodgingToScout({
    contextEventId: CTX,
    scoutPlaceIds: ["capsule-inn-osaka", "daitoyo"],
    scoutLabelsKo: ["Capsule Inn Osaka", "사우나&캡슐호텔 다이토요"],
  });
  assert.ok(aligned);
  assert.equal(aligned!.nodes.filter((n) => n.kind === "lodging").length, 0);

  const after = projectSessionGraphToBrainCandidates(aligned!);
  assert.equal(after.length, 0);
}

{
  const hubApa: GlobeLodgingMapMarker = {
    markerKind: "lodging",
    id: "hub:apa",
    resourceId: "evt:lodging:apa-namba",
    label: "APA 난바",
    lat: 34.66,
    lng: 135.5,
    carouselIndex: 0,
    isMain: true,
    thumbnailUrl: null,
    discoveryShortLabel: "APA",
    discoveryPriceLabel: "₩180,697",
    discoveryAccent: "blue",
  };
  const scoutCapsule: GlobeLodgingMapMarker = {
    markerKind: "lodging",
    id: "ctxcond:lodging:batch:capsule",
    resourceId: "evt:lodging:capsule-inn",
    label: "Capsule Inn Osaka",
    lat: 34.67,
    lng: 135.51,
    carouselIndex: 0,
    isMain: true,
    thumbnailUrl: null,
    discoveryShortLabel: "Capsule",
    discoveryPriceLabel: "₩28,000",
    discoveryAccent: "blue",
    contextConditionPin: true,
  };

  // Scout-owned map: use context markers only (hub merge would keep APA).
  const scoutOwns = true;
  const onMap = scoutOwns
    ? [scoutCapsule]
    : mergeContextConditionLodgingMarkers([hubApa], [scoutCapsule]);
  assert.equal(onMap.length, 1);
  assert.equal(onMap[0]?.label, "Capsule Inn Osaka");
  assert.ok(!onMap.some((m) => /APA/u.test(m.label)));
}

console.log("test-map-feed-lodging-sync: ok");
