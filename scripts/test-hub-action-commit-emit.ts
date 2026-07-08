import assert from "node:assert/strict";
import {
  confirmContextActionInjection,
  markContextActionInjectionExecuted,
  type ContextActionInjection,
} from "../lib/globe/context-action-injection";
import {
  clearHubActionLog,
  readHubActionLog,
} from "../lib/globe/resource/hub-action-record-store";

const CTX = "evt-commit-hub-action";
const RESOURCE = `${CTX}:lodging:place-stay`;

clearHubActionLog(CTX);

const awaiting: ContextActionInjection = {
  id: "ctxact-test-1",
  contextEventId: CTX,
  phase: "awaiting_confirm",
  intent: {
    kind: "book_lodging",
    resourceKind: "lodging",
    confidence: 1,
  },
  target: {
    kind: "lodging",
    placeId: "place-stay",
    title: "테스트 호텔",
    priceLineKo: "1박 100,000원",
    addressKo: null,
  },
  confirmPromptKo: "예약할까요?",
  confirmAcceptLabelKo: "예",
  confirmRejectLabelKo: "아니오",
  injectedAction: {
    actionTypeId: "field.lodging_book",
    labelKo: "예약",
    href: "https://maps.example.com/book",
    internalRoute: false,
  },
  commitHints: {
    resourceId: RESOURCE,
    slot: { start: "2026-08-01", end: "2026-08-03" },
    amount: 100000,
    currency: "KRW",
  },
};

const confirmed = confirmContextActionInjection(awaiting);
assert.equal(confirmed.phase, "injected");

let log = readHubActionLog(CTX);
assert.equal(log.length, 1);
assert.equal(log[0]?.type, "reserve");
assert.equal(log[0]?.status, "pending");
assert.equal(log[0]?.resourceId, RESOURCE);

const executed = markContextActionInjectionExecuted(confirmed);
assert.equal(executed.phase, "executed");

log = readHubActionLog(CTX);
assert.equal(log.length, 2);
assert.equal(log[1]?.type, "reserve");
assert.equal(log[1]?.status, "success");
assert.equal(log[1]?.supersedesActionId, log[0]?.actionId);
assert.ok(log[1]?.externalRef?.includes("maps.example.com"));

clearHubActionLog(CTX);

const payAwaiting: ContextActionInjection = {
  ...awaiting,
  id: "ctxact-test-pay",
  intent: {
    kind: "pay_lodging",
    resourceKind: "lodging",
    confidence: 1,
  },
};

confirmContextActionInjection(payAwaiting);
markContextActionInjectionExecuted({
  ...payAwaiting,
  phase: "injected",
});
log = readHubActionLog(CTX);
assert.deepEqual(
  log.map((row) => [row.type, row.status]),
  [
    ["purchase", "pending"],
    ["purchase", "success"],
  ],
);

clearHubActionLog(CTX);
console.log("test-hub-action-commit-emit: ok");
