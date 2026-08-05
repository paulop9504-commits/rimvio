/**
 * Slice A — near scout fail-closed (no Namba/Osaka silent seed).
 * Run: npx tsx scripts/test-near-scout-anchor-fail-closed.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertSpatialAnchorResolved,
  gateNearScoutAnchor,
  isNearScoutUtterance,
} from "@/lib/context-workspace/reality-anchor";
import { resolveSpatialAnchorDetailed } from "@/lib/spatial-retrieval/anchor-resolver";
import type { SpatialDiscoveryIntent } from "@/lib/spatial-retrieval/types";

assert.equal(isNearScoutUtterance("모리노미아역 근처 호텔"), true);
assert.equal(isNearScoutUtterance("모리노미아역 근처 맛집"), true);
assert.equal(isNearScoutUtterance("호텔 찾아줘"), false);

// 1) Morinomiya + lodging
const hotel = gateNearScoutAnchor({
  utterance: "모리노미아역 근처 호텔",
});
assert.equal(hotel.gated, true);
assert.ok(hotel.ok, "Morinomiya lodging must resolve");
if (hotel.ok) {
  assert.match(hotel.anchor.labelKo, /모리노미/u);
  // Not APA Namba seed
  const nambaish =
    Math.abs(hotel.anchor.lat - 34.6654) < 0.002 &&
    Math.abs(hotel.anchor.lng - 135.501) < 0.002;
  assert.equal(nambaish, false, "must not be Namba seed coords");
}

// 2) Morinomiya + eatery — same Anchor, different Target (gate ignores Target)
const eatery = gateNearScoutAnchor({
  utterance: "모리노미아역 근처 맛집",
});
assert.equal(eatery.gated, true);
assert.ok(eatery.ok);
if (eatery.ok && hotel.ok) {
  assert.equal(eatery.anchor.id, hotel.anchor.id);
}

// 3) Unknown place — STOP, no scout seed
const missing = gateNearScoutAnchor({
  utterance: "없는역XYZ큐큐 근처 호텔",
});
assert.equal(missing.gated, true);
assert.equal(missing.ok, false);
if (!missing.ok) {
  assert.equal(missing.code, "ANCHOR_NOT_FOUND");
}

// 4) Ambiguous — candidates, no resolve
const ambiguous = assertSpatialAnchorResolved({
  hasNearConstraint: true,
  anchor: null,
  nearLabelKo: "○○역",
  candidates: [
    { labelKo: "모리노미아역", utterance: "모리노미아역 근처 호텔" },
    { labelKo: "모리노미야 공원", utterance: "모리노미야 공원 근처 호텔" },
  ],
});
assert.equal(ambiguous.ok, false);
if (!ambiguous.ok) {
  assert.equal(ambiguous.code, "ANCHOR_AMBIGUOUS");
  assert.ok(ambiguous.candidates.length >= 2);
}

// Spatial resolver: empty pool + Namba NL must NOT invent fallback_seed
const intent: SpatialDiscoveryIntent = {
  type: "SPATIAL_DISCOVERY",
  targetEntity: "restaurant",
  anchorEntity: "hotel",
  relation: "nearby",
  constraints: {
    distance: null,
    walkingTime: null,
    category: null,
    budgetBand: null,
    scheduleWindow: null,
  },
  rawText: "난바 호텔 근처 맛집",
};
const emptyPool = resolveSpatialAnchorDetailed({
  intent,
  contextId: "ctx_test",
  candidates: [],
});
assert.equal(emptyPool.ok, false);
assert.ok(!("source" in emptyPool && emptyPool.ok));

const resolverSrc = readFileSync(
  join(process.cwd(), "lib/spatial-retrieval/anchor-resolver.ts"),
  "utf8",
);
assert.ok(!resolverSrc.includes('source: "fallback_seed"'));
assert.ok(!resolverSrc.includes("ent_namba_hotel"));

const lodgingTurn = readFileSync(
  join(process.cwd(), "lib/context-workspace/try-apply-workspace-lodging-turn.ts"),
  "utf8",
);
assert.ok(lodgingTurn.includes("gateNearScoutAnchorAsync"));

const agentLoop = readFileSync(
  join(process.cwd(), "lib/context-run/workspace-agent-loop.ts"),
  "utf8",
);
assert.ok(agentLoop.includes("gateNearScoutAnchorAsync"));

console.log("OK — near-scout-anchor-fail-closed");
