/**
 * Object Map Pipeline — itinerary line + prepare Select gate + Field awaiting.
 * Run: npx tsx scripts/test-object-map-pipeline.ts
 */

import assert from "node:assert/strict";
import { buildWorkspaceItineraryLineCoords } from "@/lib/context-workspace/map/build-workspace-itinerary-line";
import { prepareWorkspaceNodeBooking } from "@/lib/context-workspace/prepare-workspace-booking";
import {
  isWorkspacePlaceAwaitingField,
  workspacePlacePrepareOperationId,
} from "@/lib/context-workspace/workspace-place-prepare-status";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import { copy } from "@/lib/copy/human-ko";
import { upsertPreparedRealityOperation } from "@/lib/reality-queue/prepared-operations-store";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

function node(
  partial: Partial<ContextWorkspaceNode> &
    Pick<ContextWorkspaceNode, "id" | "title" | "lat" | "lng">,
): ContextWorkspaceNode {
  return {
    kind: "lodging",
    placeId: partial.id,
    summaryKo: "",
    rating: 4.5,
    priceBand: 2,
    amountLabel: "₩120,000",
    thumbnailUrl: null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "test",
    ...partial,
  };
}

console.log("═══ itinerary LineString ═══");
const line = buildWorkspaceItineraryLineCoords([
  node({ id: "a", title: "A", lat: 34.66, lng: 135.5 }),
  node({ id: "b", title: "B", lat: 34.67, lng: 135.51, visible: false }),
  node({ id: "c", title: "C", lat: 34.68, lng: 135.52 }),
]);
assert.equal(line.length, 2);
assert.deepEqual(line[0], [135.5, 34.66]);
assert.deepEqual(line[1], [135.52, 34.68]);

console.log("═══ prepare Select gate ═══");
assert.ok(!copy.globe.workspacePrepareReserveCta.includes("결제"));
assert.equal(copy.globe.workspacePrepareReserveCta, "예약 준비");
assert.equal(copy.globe.workspacePrepareAwaitingFieldCta, "결재함 대기");
assert.equal(copy.globe.workspacePrepareOpenFieldCta, "결재함에서 승인");

const blocked = prepareWorkspaceNodeBooking({
  contextEventId: "ctx-test",
  node: node({
    id: "h1",
    title: "난바 호텔",
    lat: 34.66,
    lng: 135.5,
    selected: false,
  }),
});
assert.equal(blocked.ok, false);

console.log("═══ awaiting Field status ═══");
const ctx = "ctx-await";
const placeId = "hotel-namba";
assert.equal(
  isWorkspacePlaceAwaitingField({ contextEventId: ctx, placeId }),
  false,
);

const op = {
  operationId: workspacePlacePrepareOperationId(ctx, placeId),
  type: "booking_prep",
  domain: "travel",
  status: "pending",
  contextEventId: ctx,
  contextLabelKo: "숙소 준비",
  labelKo: "난바 호텔",
  createdBy: "ai_assistant",
  preview: {
    titleKo: "난바 호텔",
    summaryKo: "예약 준비 완료",
  },
  needApproval: true,
  dependsOnItemIds: [],
  dependencyNoteKo: null,
  undoAllowed: true,
  expiresAtIso: null,
  sourceRef: placeId,
  engineId: null,
  kind: "lodging",
} as RealityOperationV1;

upsertPreparedRealityOperation(op);
assert.equal(
  isWorkspacePlaceAwaitingField({ contextEventId: ctx, placeId }),
  true,
);

console.log("OK — object map pipeline");
