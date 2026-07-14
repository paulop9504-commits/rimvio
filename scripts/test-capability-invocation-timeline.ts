/**
 * Capability invocation rollup — hub timeline + providerMemberId exposure.
 */

import assert from "node:assert/strict";
import {
  appendContextCapabilityInvocationToMetadata,
  readContextCapabilityInvocationsFromMetadata,
} from "../lib/marketplace/context-capability-invocation-metadata";
import {
  buildCapabilityInvocationTimelineRows,
  formatCapabilityInvocationTimelineLabel,
} from "../lib/marketplace/format-capability-invocation-timeline";
import { rollupInvocationsByProviderMember } from "../lib/marketplace/rollup-invocations-by-provider-member";
import { buildContextHubTimelineRows } from "../lib/globe/context-hub/build-context-hub-timeline-rows";
import {
  appendEngineEventToMetadata,
  readEngineEventsFromMetadata,
} from "../lib/engine/engine-event-metadata";
import { createReserveAction } from "../lib/globe/resource/hub-action-record";
import type { CapabilityInvocationRecord } from "../lib/marketplace/marketplace-contract";

function sampleInvocation(input: {
  capabilityId: string;
  providerMemberId: string;
  providerId: string;
  success?: boolean;
  timestamp: string;
  invocationId: string;
}): CapabilityInvocationRecord {
  return {
    invocationId: input.invocationId,
    capabilityId: input.capabilityId,
    providerId: input.providerId,
    publisherId: input.providerMemberId,
    providerMemberId: input.providerMemberId,
    costUnits: 0.02,
    success: input.success ?? true,
    timestamp: input.timestamp,
  };
}

let metadata: Record<string, unknown> = {};

metadata = appendContextCapabilityInvocationToMetadata({
  metadata,
  record: sampleInvocation({
    invocationId: "mkt-inv-nav-1",
    capabilityId: "NAVIGATE",
    providerId: "kakao_navi",
    providerMemberId: "kakao-corp",
    timestamp: "2026-07-10T10:00:00.000Z",
  }),
});

metadata = appendContextCapabilityInvocationToMetadata({
  metadata,
  record: sampleInvocation({
    invocationId: "mkt-inv-hotel-1",
    capabilityId: "BOOK_HOTEL",
    providerId: "acme_lodging_api",
    providerMemberId: "acme_hotels",
    timestamp: "2026-07-10T11:00:00.000Z",
  }),
});

const invocations = readContextCapabilityInvocationsFromMetadata(metadata);
assert.equal(invocations.length, 2);
assert.equal(invocations[1]?.providerMemberId, "acme_hotels");

const navLabel = formatCapabilityInvocationTimelineLabel(invocations[0]!);
assert.equal(navLabel, "길찾기 · 카카오");

const hotelLabel = formatCapabilityInvocationTimelineLabel(invocations[1]!);
assert.equal(hotelLabel, "숙소 예약 · ACME 호텔");

const timelineRows = buildCapabilityInvocationTimelineRows(invocations);
assert.equal(timelineRows[0]?.labelKo, "숙소 예약 · ACME 호텔");
assert.equal(timelineRows[0]?.providerMemberId, "acme_hotels");

const rollup = rollupInvocationsByProviderMember(invocations);
assert.equal(rollup.length, 2);
const acmeRollup = rollup.find((row) => row.memberId === "acme_hotels");
assert.ok(acmeRollup);
assert.equal(acmeRollup?.successfulInvocations, 1);

metadata = appendEngineEventToMetadata({
  metadata,
  engineId: "lodging_search",
  kind: "main_selected",
  executionNodeId: "stay",
});

const reserve = createReserveAction({
  contextEventId: "ctx-osaka",
  resourceId: "ctx-osaka:lodging:lp1",
  sourceHubId: "lodging",
  approvalPolicy: "user_tap",
  status: "success",
  payload: { slot: { start: "2026-07-16", end: "2026-07-17" }, guestCount: 2 },
});

const merged = buildContextHubTimelineRows(
  [reserve],
  readEngineEventsFromMetadata(metadata),
  invocations,
);

assert.ok(merged.some((row) => row.kind === "capability" && row.providerMemberId === "acme_hotels"));
assert.ok(
  merged.some((row) => row.labelKo === "숙소 예약 · ACME 호텔"),
  "capability invocation row with providerMemberId label",
);

console.log("test-capability-invocation-timeline: ok");
