#!/usr/bin/env npx tsx
/**
 * Trip prepare offer — Cursor-style chips after destination.
 * Run: npx tsx scripts/test-trip-prepare-offer.ts
 */
import assert from "node:assert/strict";

import {
  buildTripPrepareChips,
  buildTripPrepareOfferLine,
} from "@/lib/globe/trip-situation-router/build-trip-prepare-offer";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";

const line = buildTripPrepareOfferLine("오사카");
assert.match(line, /오사카/);
assert.match(line, /준비해드릴까요/);

const chips = buildTripPrepareChips("오사카");
assert.ok(chips.length >= 4);
assert.equal(chips[0]?.action, "lodging");
assert.ok(chips.some((c) => c.action === "eatery"));
assert.ok(chips.some((c) => c.action === "route"));
assert.ok(chips.some((c) => c.action === "itinerary"));
assert.ok(chips.some((c) => c.action === "prep_all"));

for (const chip of chips) {
  const submit = chip.submitText?.trim();
  assert.ok(submit, `submit: ${chip.id}`);
  const routes =
    isWorkspaceAgentWorkUtterance(submit!) ||
    isNewTripGlobeIngressUtterance(submit!);
  assert.equal(routes, true, `sets Workspace/trip: ${submit}`);
}

console.log("ok — trip prepare offer chips → Workspace work NL");
