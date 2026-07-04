#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
} from "../lib/globe/eatery/eatery-resource-types";
import { buildTravelBrainProjection } from "../lib/situation-projection/travel-brain-personalization";
import { buildTravelProjectionGhosts } from "../lib/situation-projection/travel-brain-projection";

resetEventCandidatesForTests([]);

const event = commitEventUpsert({
  id: "ev-tokyo-micro-eatery",
  title: "도쿄 여행",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "도쿄",
  metadata: {
    feedPlanEnabled: true,
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "eatery-ramen",
        name: "골목 라멘",
        lat: 35.681,
        lng: 139.767,
        images: ["https://example.com/ramen.jpg"],
        cuisineHint: "라멘",
        provider: "mock",
      },
      {
        placeId: "eatery-izakaya",
        name: "로컬 이자카야",
        lat: 35.682,
        lng: 139.769,
        images: ["https://example.com/izakaya.jpg"],
        cuisineHint: "이자카야",
        provider: "mock",
      },
    ],
  },
});

const travel = buildTravelBrainProjection(event);
const ghosts = buildTravelProjectionGhosts(event, travel);
const eateryGhosts = ghosts.filter((ghost) => ghost.axisId === "eatery");

assert.equal(eateryGhosts.length, 2, "macro bias node should be omitted when inventory exists");
assert.ok(
  eateryGhosts.every((ghost) => ghost.placeId?.trim()),
  "every eatery ghost should be place-backed",
);
assert.ok(
  !eateryGhosts.some((ghost) => /가성비 식사|로컬 한 끼/u.test(ghost.label)),
  "macro eatery labels should not appear when inventory exists",
);
assert.equal(eateryGhosts[0]?.previewImageUrl, "https://example.com/ramen.jpg");
assert.equal(eateryGhosts[0]?.label, "골목 라멘");

console.log("test-travel-brain-micro-eatery-ghosts: ok");
