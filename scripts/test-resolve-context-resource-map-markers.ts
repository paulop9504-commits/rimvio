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
    thumbnailUrl: "https://example.com/a.jpg",
  },
  {
    resourceId: "b",
    lat: 35.681,
    lng: 139.761,
    isMain: true,
    thumbnailUrl: "https://example.com/b.jpg",
  },
];

const single = resolveContextResourceMapMarkers({
  markers: [markers[1]!],
});
assert.equal(single.length, 1);
assert.equal(single[0]?.resourceId, "b");

const spreadWithoutHub = resolveContextResourceMapMarkers({ markers });
assert.equal(spreadWithoutHub.length, 2);
assert.ok(spreadWithoutHub.every((row) => row.calloutOffsetX == null));

const radial = resolveContextResourceMapMarkers({
  markers,
  hubLat: 35.68,
  hubLng: 139.76,
});
assert.equal(radial.length, 2);
assert.equal(radial[0]?.lat, 35.68);
assert.ok(radial[0]?.calloutOffsetX != null);
assert.notEqual(radial[0]?.calloutOffsetX, radial[1]?.calloutOffsetX);

const stacked = resolveContextResourceMapMarkers({
  markers: [
    {
      resourceId: "x",
      lat: 35.6895,
      lng: 139.6917,
      isMain: false,
      thumbnailUrl: "https://example.com/x.jpg",
    },
    {
      resourceId: "y",
      lat: 35.6895,
      lng: 139.6917,
      isMain: true,
      thumbnailUrl: "https://example.com/y.jpg",
    },
  ],
});
assert.equal(stacked.length, 2);
assert.ok(stacked.every((row) => row.calloutOffsetX != null));

console.log("test-resolve-context-resource-map-markers: ok");
