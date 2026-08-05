/**
 * Slice B — Distance Gate keeps near / drops far (800m default).
 * Run: npx tsx scripts/test-distance-gate-near-scout.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_NEAR_RADIUS_METERS,
  distanceGateNearScout,
  gateNearScoutAnchor,
  metersBetween,
} from "@/lib/context-workspace/reality-anchor";

assert.equal(DEFAULT_NEAR_RADIUS_METERS, 800);

const gate = gateNearScoutAnchor({
  utterance: "모리노미아역 근처 맛집",
});
assert.ok(gate.gated && gate.ok);
if (!(gate.gated && gate.ok)) throw new Error("anchor");

const near = {
  id: "near",
  labelKo: "근처점",
  lat: gate.anchor.lat + 0.002, // ~220m
  lng: gate.anchor.lng,
};
const far = {
  id: "far",
  labelKo: "먼곳",
  lat: gate.anchor.lat + 0.04, // ~4.4km
  lng: gate.anchor.lng,
};
const nambaish = {
  id: "namba",
  labelKo: "난바쪽",
  lat: 34.6654,
  lng: 135.501,
};

const nearM = metersBetween(
  gate.anchor.lat,
  gate.anchor.lng,
  near.lat,
  near.lng,
);
const farM = metersBetween(
  gate.anchor.lat,
  gate.anchor.lng,
  far.lat,
  far.lng,
);
assert.ok(nearM < 800, `near should be <800m, got ${nearM}`);
assert.ok(farM > 800, `far should be >800m, got ${farM}`);

const gated = distanceGateNearScout({
  anchor: {
    lat: gate.anchor.lat,
    lng: gate.anchor.lng,
    labelKo: gate.anchor.labelKo,
  },
  candidates: [near, far, nambaish],
  patchMeters: null,
});
assert.equal(gated.radiusMeters, 800);
assert.equal(gated.keptCount, 1);
assert.equal(gated.kept[0]?.id, "near");
assert.ok(gated.dropped.some((d) => d.id === "far"));
assert.ok(gated.dropped.some((d) => d.id === "namba"));

const lodging = readFileSync(
  join(process.cwd(), "lib/context-workspace/try-apply-workspace-lodging-turn.ts"),
  "utf8",
);
assert.ok(lodging.includes("distanceGateNearScout"));

const discovery = readFileSync(
  join(process.cwd(), "lib/context-run/object-discovery.ts"),
  "utf8",
);
assert.ok(discovery.includes("distanceGateNearScout"));

const spatial = readFileSync(
  join(
    process.cwd(),
    "lib/spatial-retrieval/apply-spatial-discovery-to-workspace.ts",
  ),
  "utf8",
);
assert.ok(spatial.includes("distanceGateNearScout"));

console.log("OK — distance-gate-near-scout");
