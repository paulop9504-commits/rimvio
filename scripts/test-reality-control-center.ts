import assert from "node:assert/strict";
import { commitContextExecutionPlanFromApproval } from "@/lib/context-execution/commit-plan-from-approval";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import { buildRealityCommitReceipt } from "@/lib/reality-queue/build-reality-commit-receipt";
import { buildRealityControlSnapshot } from "@/lib/reality-queue/build-reality-control-snapshot";
import {
  clearRealityQueueHolds,
  holdRealityQueueItems,
  readRealityQueueHeldItemIds,
} from "@/lib/reality-queue/reality-queue-hold-store";
import { parseFieldDashboardTab } from "@/lib/nav/field-dashboard-ingress";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import type { RealityQueueItemV1 } from "@/lib/reality-queue/types";

assert.equal(parseFieldDashboardTab("discovery"), "queue");
assert.equal(parseFieldDashboardTab("queue"), "queue");
assert.equal(parseFieldDashboardTab("trades"), "trades");
assert.equal(parseFieldDashboardTab("mine"), "mine");
assert.equal(parseFieldDashboardTab("nope"), undefined);

const empty = buildRealityControlSnapshot({
  tradeSessions: [],
  events: [],
  applyHolds: false,
});
assert.equal(empty.version, 1);
assert.equal(empty.items.length, 0);
assert.equal(empty.canCommit, false);
assert.ok(empty.subtitleKo.length > 0);

const trade = {
  handshakeId: "hs-1",
  productTitle: "에어팟",
  priceLine: "12만원",
  meetPlaceLabel: "강남",
  tradeStatus: "confirmed",
  statusHeadlineKo: "만남 확정",
  showAcceptProposal: false,
  canConfirmHandshakeComplete: false,
} as MarketTradeSessionView;

const withTrade = buildRealityControlSnapshot({
  events: [],
  tradeSessions: [trade],
  applyHolds: false,
});

assert.equal(withTrade.items.length, 1);
assert.equal(withTrade.items[0]?.kind, "trade");
assert.equal(withTrade.items[0]?.status, "ready");
assert.equal(withTrade.items[0]?.amountLabel, "12만원");
assert.equal(withTrade.impact.costLabel, "12만원");
assert.equal(withTrade.canCommit, true);

clearRealityQueueHolds();
holdRealityQueueItems(["trade:hs-1"]);
assert.equal(readRealityQueueHeldItemIds().has("trade:hs-1"), true);
const held = buildRealityControlSnapshot({
  events: [],
  tradeSessions: [trade],
});
assert.equal(held.items.length, 0);
assert.equal(held.canCommit, false);
clearRealityQueueHolds();

const preparedPlan: ContextExecutionPlanV1 = {
  version: 1,
  contextId: "ctx-1",
  goalKo: "오사카 여행",
  osPhase: "waiting_approval",
  approval: "pending",
  steps: [
    {
      stepId: "s1",
      nodeId: "n1",
      order: 0,
      labelKo: "숙소 확정",
      engineId: "lodging_search",
      status: "prepared",
      lastError: null,
      updatedAtIso: "2026-07-11T00:00:00.000Z",
    },
  ],
  currentStepId: "s1",
  createdAtIso: "2026-07-11T00:00:00.000Z",
  updatedAtIso: "2026-07-11T00:00:00.000Z",
};

const committed = commitContextExecutionPlanFromApproval({
  plan: preparedPlan,
  now: new Date("2026-07-11T01:00:00.000Z"),
});
assert.equal(committed.osPhase, "committed");
assert.equal(committed.approval, "approved");
assert.equal(committed.steps[0]?.status, "done");

const receiptItems: RealityQueueItemV1[] = [
  {
    itemId: "step:ctx-1:s1",
    kind: "execution_step",
    status: "ready",
    labelKo: "숙소 확정",
    detailKo: "오사카",
    amountLabel: null,
    contextEventId: "evt-osaka",
    sourceRef: "s1",
  },
  {
    itemId: "step:ctx-1:s2",
    kind: "execution_step",
    status: "ready",
    labelKo: "항공 준비",
    detailKo: null,
    amountLabel: null,
    contextEventId: "evt-osaka",
    sourceRef: "s2",
  },
];

const receipt = buildRealityCommitReceipt({
  items: receiptItems,
  approvedPlanCount: 1,
  contextEventIds: ["evt-osaka"],
  titleKo: "현실이 바뀌었어요",
  disclaimerKo: "결제·예약은 아직 안 했어요",
  now: new Date("2026-07-11T02:00:00.000Z"),
});
assert.equal(receipt.version, 1);
assert.equal(receipt.titleKo, "현실이 바뀌었어요");
assert.deepEqual(receipt.lines, ["숙소 확정", "항공 준비"]);
assert.equal(receipt.disclaimerKo, "결제·예약은 아직 안 했어요");
assert.equal(receipt.contextEventId, "evt-osaka");
assert.equal(receipt.approvedPlanCount, 1);
assert.equal(receipt.committedAtIso, "2026-07-11T02:00:00.000Z");

const fallbackReceipt = buildRealityCommitReceipt({
  items: [],
  approvedPlanCount: 2,
  contextEventIds: [],
  titleKo: "현실이 바뀌었어요",
  disclaimerKo: "",
});
assert.deepEqual(fallbackReceipt.lines, ["단계 2건 반영"]);
assert.equal(fallbackReceipt.disclaimerKo, null);
assert.equal(fallbackReceipt.contextEventId, null);

console.log("test-reality-control-center: ok");
