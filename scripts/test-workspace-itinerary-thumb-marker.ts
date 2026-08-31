/**
 * Itinerary venue pins: thumbnail + stop-order badge chrome key + fields.
 */
import assert from "node:assert/strict";
import { tossWorkspaceMarkerChromeKey } from "../lib/context-workspace/map/build-toss-workspace-marker-el";
import type { WorkspaceMapPin } from "../lib/context-workspace/map/workspace-map-provider";

const pin: WorkspaceMapPin = {
  id: "n1",
  title: "Gyukatsu Motomura",
  lat: 34.6687,
  lng: 135.5013,
  thumbnailUrl: "https://example.com/thumb.jpg",
  stopOrder: 1,
  kind: "eatery",
};

assert.ok(pin.thumbnailUrl);
assert.equal(pin.stopOrder, 1);

const keyA = tossWorkspaceMarkerChromeKey({
  pin,
  index: 0,
  selected: true,
});
const keyB = tossWorkspaceMarkerChromeKey({
  pin: { ...pin, stopOrder: 2 },
  index: 0,
  selected: true,
});
const keyC = tossWorkspaceMarkerChromeKey({
  pin: { ...pin, thumbnailUrl: "https://example.com/other.jpg" },
  index: 0,
  selected: true,
});
assert.notEqual(keyA, keyB);
assert.notEqual(keyA, keyC);
assert.ok(keyA.includes("https://example.com/thumb.jpg"));
assert.ok(keyA.includes("|1|") || keyA.endsWith("|1") || keyA.includes("1"));

console.log("test-workspace-itinerary-thumb-marker: ok");
