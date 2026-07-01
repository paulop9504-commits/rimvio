import assert from "node:assert/strict";
import { planContextRun } from "../lib/context-run/plan-context-run";
import { resolveGlobeMapIntent } from "../lib/globe/intent-supply/resolve-globe-map-intent";

assert.equal(resolveGlobeMapIntent("나 숙소 구해야해").kind, "lodging_supply");
assert.equal(resolveGlobeMapIntent("홍대 맛집 추천").kind, "place_food_supply");
assert.equal(resolveGlobeMapIntent("정성이랑 어디 다녀왔어").kind, "people_recall");
assert.equal(resolveGlobeMapIntent("@중고 맥북").kind, "market_compose");
assert.equal(resolveGlobeMapIntent("ㅎㅇ").kind, "unknown");
assert.equal(resolveGlobeMapIntent("안녕").kind, "unknown");
assert.equal(resolveGlobeMapIntent("지도에 맥락 연결해줘").kind, "context_connect");

const ambientPlan = planContextRun({
  graphId: "graph-hi",
  goalKo: "ㅎㅇ",
  ingress: {
    kind: "text",
    text: "ㅎㅇ",
    surface: "composer",
    layerMode: "personal",
    contextEventId: "evt-germany-dwell",
  },
});

assert.equal(ambientPlan.kind, "portal_compose_run");
if (ambientPlan.kind === "portal_compose_run") {
  assert.equal(ambientPlan.composeAmbientChat, true);
  assert.equal(ambientPlan.portalIntentId, "offer");
}

const supplyPlan = planContextRun({
  graphId: "graph-recall",
  goalKo: "작년에 갔던 곳 기억나",
  ingress: {
    kind: "text",
    text: "작년에 갔던 곳 기억나",
    surface: "composer",
    layerMode: "personal",
    contextEventId: "evt-germany-dwell",
  },
});

assert.equal(supplyPlan.kind, "map_intent_supply");
if (supplyPlan.kind === "map_intent_supply") {
  assert.equal(supplyPlan.supplyInput?.contextEventId, null);
}

const connectPlan = planContextRun({
  graphId: "graph-connect",
  goalKo: "지도에 맥락 연결해줘",
  ingress: {
    kind: "text",
    text: "지도에 맥락 연결해줘",
    surface: "composer",
    layerMode: "personal",
    contextEventId: "evt-germany-dwell",
  },
});

assert.equal(connectPlan.kind, "map_intent_supply");
if (connectPlan.kind === "map_intent_supply") {
  assert.equal(connectPlan.supplyInput?.contextEventId, "evt-germany-dwell");
}

console.log("test-globe-map-intent-supply: ok");
