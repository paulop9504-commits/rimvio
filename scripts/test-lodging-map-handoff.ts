#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { mapLodgingRowToContextResource } from "../lib/globe/context-hub/read-lodging-resource-inventory";
import { buildGoogleMapsPlaceHref } from "../lib/resolvers/deep-links";

const exactHref = buildGoogleMapsPlaceHref({
  lat: 35.6895,
  lng: 139.6917,
  placeId: "tokyo-place-id",
  placeLabel: "도쿄 비즈니스 호텔",
});

assert.equal(
  exactHref,
  "https://www.google.com/maps/search/?api=1&query=35.6895%2C139.6917&query_place_id=tokyo-place-id",
);

const event = {
  id: "evt-lodging",
  title: "도쿄 출장",
  datetime: "2026-07-04T09:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
  metadata: {},
} as const;

const resource = mapLodgingRowToContextResource(event, {
  placeId: "tokyo-place-id",
  name: "도쿄 비즈니스 호텔",
  lat: 35.6895,
  lng: 139.6917,
  images: [],
  address: "Tokyo",
  mapsUrl: "https://www.google.com/maps/place/?q=place_id:stale-place-id",
  provider: "google_places",
});

assert.equal(resource.action?.kind, "open_url");
assert.equal(resource.action?.href, exactHref);
assert.match(resource.action?.href ?? "", /query=35\.6895%2C139\.6917/);
assert.match(resource.action?.href ?? "", /query_place_id=tokyo-place-id/);

console.log("test-lodging-map-handoff: ok");
