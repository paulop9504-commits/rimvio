#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  clearGlobePlacePendingVerify,
  readGlobePlacePendingVerify,
  stampGlobePlacePendingVerify,
} from "../lib/globe/globe-place-pending-verify";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

function main() {
  resetEventCandidatesForTests();

  const event = commitEventUpsert({
    id: "globe:verify-demo",
    title: "에버랜드",
    category: "experience",
    source: "manual",
    lifecycle: "active",
    datetime: new Date().toISOString(),
    place: "에버랜드",
    confidence: 0.6,
    metadata: {},
    lifecycleUpdatedAt: new Date().toISOString(),
  });

  assert.equal(readGlobePlacePendingVerify(event), null);

  const pending = stampGlobePlacePendingVerify(event, {
    source: "gps",
    askGpsOff: true,
  });
  assert.equal(readGlobePlacePendingVerify(pending), "gps");
  assert.equal(pending.metadata?.globePlaceVerifyAskGpsOff, true);

  const cleared = clearGlobePlacePendingVerify(pending);
  assert.equal(readGlobePlacePendingVerify(cleared), null);

  console.log("test-globe-place-pending-verify: ok");
}

main();
