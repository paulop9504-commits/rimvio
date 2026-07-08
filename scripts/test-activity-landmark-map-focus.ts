#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { snapGlobeToContextConditionScout } from "../lib/globe/context-agent/snap-globe-to-context-agent-anchor";

function createGlobeRef() {
  const calls: Array<{ kind: "pin" | "bounds"; payload: Record<string, number> }> = [];
  return {
    calls,
    ref: {
      current: {
        snapToPin(lat: number, lng: number) {
          calls.push({ kind: "pin", payload: { lat, lng } });
        },
        snapToDiscoveryBounds(input: {
          centerLat: number;
          centerLng: number;
          altitude: number;
        }) {
          calls.push({ kind: "bounds", payload: input });
        },
      },
    },
  };
}

const single = createGlobeRef();
snapGlobeToContextConditionScout(single.ref as never, {
  anchorLat: 35.6762,
  anchorLng: 139.6503,
  recommendations: [{ lat: 35.6329, lng: 139.8804 }],
  radiusM: 50000,
});
assert.equal(single.calls.length, 1);
assert.equal(single.calls[0]?.kind, "pin");
assert.deepEqual(single.calls[0]?.payload, { lat: 35.6329, lng: 139.8804 });

const multiple = createGlobeRef();
snapGlobeToContextConditionScout(multiple.ref as never, {
  anchorLat: 35.6762,
  anchorLng: 139.6503,
  recommendations: [
    { lat: 35.6329, lng: 139.8804 },
    { lat: 35.7101, lng: 139.8107 },
  ],
  radiusM: 50000,
});
assert.equal(multiple.calls.length, 1);
assert.equal(multiple.calls[0]?.kind, "bounds");

console.log("test-activity-landmark-map-focus: ok");
