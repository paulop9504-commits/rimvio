/**
 * Commit Verification Agent gate + Preference Graph lodging/eatery bias.
 * Run: npx tsx scripts/test-verify-commit-preference.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "@/lib/globe/context-hub/lodging-resource-types";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
} from "@/lib/globe/eatery/eatery-resource-types";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import {
  COMMIT_SCHEDULE_FEASIBILITY_META_KEY,
  buildCommitScheduleFeasibility,
  eateryPreferenceScoreDelta,
  lodgingPreferenceScoreDelta,
  observePreferenceFromUtterance,
  resetPreferenceGraphForTests,
  verifyOperationsBeforeCommit,
} from "@/lib/workstream";

resetPreferenceGraphForTests();

// --- Preference rank bias ---
observePreferenceFromUtterance("조용한 호텔로 도보로 다니고 싶어 웨이팅 싫어");
const nearQuiet = lodgingPreferenceScoreDelta({
  name: "한적한 게스트하우스",
  address: "공원 옆",
  priceKrw: 80_000,
  distanceKm: 0.7,
});
const farParty = lodgingPreferenceScoreDelta({
  name: "Party Hostel Capsule",
  address: "nightlife street",
  priceKrw: 250_000,
  distanceKm: 6,
});
assert.ok(nearQuiet > farParty, "quiet+walk should beat party+far");

const localEatery = eateryPreferenceScoreDelta({
  name: "골목 로컬 식당",
  address: "한적한 골목",
  categoryLabel: "로컬",
  distanceKm: 0.5,
  reviewCount: 40,
});
const waitingLandmark = eateryPreferenceScoreDelta({
  name: "유명 핫플 맛집",
  specialReasonKo: "웨이팅 필수",
  distanceKm: 4,
  reviewCount: 8000,
});
assert.ok(localEatery > waitingLandmark, "no_waiting should demote landmark waits");

// --- Commit feasibility builder ---
const lodgingOp: RealityOperationV1 = {
  operationId: "op:lodging-1",
  type: "booking_prep",
  domain: "travel",
  status: "ready",
  contextEventId: "ctx-verify",
  contextLabelKo: "오사카",
  labelKo: "난바 호텔",
  createdBy: "ai_assistant",
  preview: {
    titleKo: "숙소 예약",
    summaryKo: "난바 호텔",
    placeLabelKo: "난바 호텔",
    resourceId: "ctx-verify:lodging:hotel-namba",
  },
  needApproval: true,
  dependsOnItemIds: [],
  dependencyNoteKo: null,
  undoAllowed: true,
  expiresAtIso: null,
  sourceRef: "hotel-namba",
  kind: "lodging",
};

const eventOk = {
  id: "ctx-verify",
  title: "오사카 여행",
  place: "오사카",
  category: "travel",
  source: "message",
  lifecycle: "active",
  confidence: 0.9,
  metadata: {
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "hotel-namba",
        name: "난바 호텔",
        images: [],
        lat: 34.662,
        lng: 135.5013,
      },
    ],
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "eatery-near",
        name: "난바 점심",
        images: [],
        lat: 34.663,
        lng: 135.502,
      },
    ],
    [CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY]: "eatery-near",
  },
  lifecycleUpdatedAt: "2026-07-30T00:00:00.000Z",
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z",
} as EventCandidate;

const feasible = buildCommitScheduleFeasibility({
  event: eventOk,
  operations: [lodgingOp],
});
assert.ok(feasible);
assert.equal(feasible!.anchorLabelKo, "난바 호텔");
assert.equal(feasible!.activityLabelKo, "난바 점심");

const gateOk = verifyOperationsBeforeCommit({
  contextEventId: "ctx-verify",
  event: eventOk,
  operations: [lodgingOp],
});
assert.equal(gateOk.ran, true);
assert.equal(gateOk.ok, true);
assert.equal(gateOk.blocked, false);

// Late leave + far activity stamped on metadata → block Commit
const eventBlocked = {
  ...eventOk,
  id: "ctx-verify-block",
  metadata: {
    ...eventOk.metadata,
    [COMMIT_SCHEDULE_FEASIBILITY_META_KEY]: {
      activityLabelKo: "USJ",
      activityLat: 34.6654,
      activityLng: 135.4323,
      leaveReadyMinutes: 18 * 60,
      activityCloseMinutes: 18 * 60,
      transitKmh: 15,
      maxTravelMinutes: 40,
    },
  },
} as EventCandidate;

const gateBlocked = verifyOperationsBeforeCommit({
  contextEventId: "ctx-verify-block",
  event: eventBlocked,
  operations: [lodgingOp],
});
assert.equal(gateBlocked.ran, true);
assert.equal(gateBlocked.ok, false);
assert.equal(gateBlocked.blocked, true);
assert.ok(gateBlocked.reasonKo && gateBlocked.reasonKo.length > 0);

// Missing coords → skip schedule check, still allow
const gateSkip = verifyOperationsBeforeCommit({
  contextEventId: "ctx-verify-skip",
  event: {
    ...eventOk,
    id: "ctx-verify-skip",
    metadata: {},
  } as EventCandidate,
  operations: [lodgingOp],
});
assert.equal(gateSkip.ok, true);
assert.ok(
  gateSkip.report.findings.some((f) => f.id === "verify_skip_no_coords"),
);

console.log("OK — verify-commit-preference");
