#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
} from "../lib/globe/eatery/eatery-resource-types";
import { composeBrainProjectionManifest } from "../lib/situation-projection/compose-brain-projection";
import { projectGhostEateryGlobeMarkers } from "../lib/situation-projection/project-ghost-eatery-globe-markers";
import { resetProjectionStoreForTests } from "../lib/situation-projection/projection-store";

resetEventCandidatesForTests([]);
resetProjectionStoreForTests();

const event = commitEventUpsert({
  id: "ev-osaka-ghost-map",
  title: "오사카 여행",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "오사카",
  metadata: {
    feedPlanEnabled: true,
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "eatery-1",
        name: "난바 로컬 식당",
        lat: 34.667,
        lng: 135.501,
        images: [],
        cuisineHint: "오코노미야키",
        specialReasonKo: "동선 안에서 현지 느낌을 살리기 좋은 후보예요",
        virtualCandidate: true,
      },
    ],
  },
});

const manifest = composeBrainProjectionManifest({
  event,
  trigger: { source: "manual", atIso: new Date().toISOString() },
});

const markers = projectGhostEateryGlobeMarkers({ event, manifest });
assert.equal(markers.length, 1);
assert.equal(markers[0]?.resourceId, `${event.id}:eatery:eatery-1`);
assert.equal(markers[0]?.virtualCandidate, true);
assert.equal(markers[0]?.lat, 34.667);
assert.equal(markers[0]?.lng, 135.501);
assert.equal(markers[0]?.ontologyBadgeLabel, "맛집 노드");
assert.equal(markers[0]?.discoveryPriceLabel, "오코노미야키");
assert.equal(markers[0]?.label, "난바 로컬 식당");

console.log("test-ghost-eatery-globe-markers: ok");
