#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { buildTravelBrainProjection } from "../lib/situation-projection/travel-brain-personalization";
import { buildTravelProjectionGhosts } from "../lib/situation-projection/travel-brain-projection";

resetEventCandidatesForTests([]);

const tokyoEvent = commitEventUpsert({
  id: "ev-tokyo-empty-eatery",
  title: "도쿄 여행",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "도쿄",
  metadata: { feedPlanEnabled: true },
});

const travel = buildTravelBrainProjection(tokyoEvent);
const ghosts = buildTravelProjectionGhosts(tokyoEvent, travel);
const eateryGhosts = ghosts.filter((ghost) => ghost.axisId === "eatery");

assert.ok(eateryGhosts.length >= 1, "overseas travel should keep search handoff ghosts");
assert.ok(
  eateryGhosts.every((ghost) => /restaurant|cafe/u.test(ghost.searchQuery ?? "")),
  "overseas fallback queries should target Google-friendly English terms",
);
assert.ok(
  !eateryGhosts.some((ghost) => /한식|브런치 카페|골목 한식당/u.test(ghost.label)),
  "KR-only mock labels must not appear for overseas travel",
);

console.log("test-travel-brain-overseas-eatery-fallback: ok");
