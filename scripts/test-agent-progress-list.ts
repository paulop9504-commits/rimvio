import assert from "node:assert/strict";
import { flowStepsToAgentTasks } from "../lib/portal/compose-draft/flow-steps-to-agent-tasks";
import { resolveSellItemFlow, SELL_ITEM_FLOW } from "../lib/portal/compose-draft/sell-item-flow";
import { tradeProgressStepsToAgentTasks } from "../lib/globe/market/trade-progress-steps-to-agent-tasks";

const emptyDraft = flowStepsToAgentTasks(SELL_ITEM_FLOW, {});
assert.equal(emptyDraft[0]?.status, "in_progress");
assert.equal(emptyDraft[1]?.status, "pending");

const partialDraft = flowStepsToAgentTasks(SELL_ITEM_FLOW, {
  productName: "아이폰 13",
  priceKrw: 400_000,
});
assert.equal(partialDraft[0]?.status, "in_progress");
assert.equal(partialDraft[1]?.status, "pending");

const basicDone = flowStepsToAgentTasks(SELL_ITEM_FLOW, {
  productName: "의자",
  priceKrw: 400_000,
  placeLabel: "계산동 722",
});
assert.equal(basicDone[0]?.status, "done");
assert.equal(basicDone[1]?.status, "in_progress");
assert.match(basicDone[1]?.label ?? "", /사진/u);

const smartphoneFlow = resolveSellItemFlow({ categoryId: "smartphone" });
const smartphonePartial = flowStepsToAgentTasks(smartphoneFlow, {
  productName: "아이폰 15",
  priceKrw: 700_000,
  condition: "상태 좋음",
});
assert.equal(smartphonePartial[0]?.status, "in_progress");
assert.equal(smartphonePartial[1]?.status, "pending");

const tradeTasks = tradeProgressStepsToAgentTasks([
  { id: "confirmed", labelKo: "확인", state: "done" },
  { id: "meeting", labelKo: "만남", state: "active" },
  { id: "done", labelKo: "완료", state: "upcoming" },
]);
assert.equal(tradeTasks[1]?.status, "in_progress");

console.log("test-agent-progress-list: ok");
