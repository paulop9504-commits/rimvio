#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resolveContextResourceMapMarkers,
  sanitizeMapMarkerSupportLabel,
  sanitizeOntologyMapBadgeLabel,
} from "../lib/globe/resolve-context-resource-map-markers";

assert.equal(sanitizeMapMarkerSupportLabel("google_places"), null);
assert.equal(sanitizeMapMarkerSupportLabel("대전역 도보 5분"), "대전역 도보 5분");
assert.equal(sanitizeOntologyMapBadgeLabel("숙소 노드"), "숙소");

const markers = [
  {
    resourceId: "a",
    lat: 35.68,
    lng: 139.76,
    isMain: false,
  },
  {
    resourceId: "b",
    lat: 35.681,
    lng: 139.761,
    isMain: true,
  },
];

const single = resolveContextResourceMapMarkers({ markers });
assert.equal(single.length, 1);
assert.equal(single[0]?.resourceId, "b");

const radial = resolveContextResourceMapMarkers({
  markers,
  hubLat: 35.68,
  hubLng: 139.76,
  stagedDiscoveryCount: 2,
});
assert.equal(radial.length, 2);
assert.equal(radial[0]?.lat, 35.68);
assert.ok(radial[0]?.calloutOffsetX != null);

console.log("test-resolve-context-resource-map-markers: ok");
