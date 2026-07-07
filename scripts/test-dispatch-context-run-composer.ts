#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { bindSituation } from "../lib/context-run/bind-situation";
import { planContextRun } from "../lib/context-run/plan-context-run";
import type { ContextRunIngress } from "../lib/context-run/ingress-types";

function planFor(
  text: string,
  layerMode: "personal" | "discovery" = "personal",
) {
  const ingress: ContextRunIngress = {
    kind: "text",
    text,
    surface: "composer",
    layerMode,
    contextEventId: null,
  };
  return planContextRun(bindSituation(ingress));
}

const marketBare = planFor("아이폰 팔고 싶어");
assert.equal(marketBare.kind, "portal_compose_run");
assert.equal(marketBare.portalIntentId, "offer");

const marketMention = planFor("@중고 맥북");
assert.equal(marketMention.kind, "portal_compose_run");

const genericMemo = planFor("점심에 김치찌개 먹음");
assert.equal(genericMemo.kind, "text_ingest");

const ambientHi = planFor("ㅎㅇ");
assert.equal(ambientHi.kind, "small_talk");
assert.ok(
  (ambientHi.smallTalkReplyKo ?? "").length > 0,
  "small talk must carry a reply",
);

const thanks = planFor("고마워");
assert.equal(thanks.kind, "small_talk");

const capability = planFor("너 뭐 할 수 있어?");
assert.equal(capability.kind, "small_talk");

const recallPerson = planFor("정성이랑 어디 갔어");
assert.equal(recallPerson.kind, "personal_context_ask");

const urlAction = planFor("https://maps.google.com");
assert.equal(urlAction.kind, "text_ingest");

const summaryAsk = planFor("지난 제주 기록 정리해줘");
assert.equal(summaryAsk.kind, "personal_context_ask");

const compareAsk = planFor("여유 있게 가는 거랑 빡빡하게 가는 거 비교해줘");
assert.equal(compareAsk.kind, "personal_context_ask");

const lodging = planFor("호텔 추천해줘");
assert.equal(lodging.kind, "experience_run");

const trip = planFor("부산 출장");
assert.equal(trip.kind, "globe_ingress");

const eatery = planFor("강남 맛집 추천");
assert.equal(eatery.kind, "experience_run");

const mealMention = planFor("@식사 강남역");
assert.equal(mealMention.kind, "mention_contract");
assert.equal(mealMention.mentionFeatureId, "meal");

const reminderMention = planFor("@알림");
assert.equal(reminderMention.kind, "mention_contract");
assert.equal(reminderMention.needsConfirmOnly, true);

const discoveryMarket = planFor("아이폰 팔고 싶어", "discovery");
assert.equal(discoveryMarket.kind, "discovery_browse");

const discoveryVague = planFor("근처 맛집", "discovery");
assert.equal(discoveryVague.kind, "discovery_hint");

const bind = bindSituation({
  kind: "text",
  text: "테스트",
  surface: "composer",
  layerMode: "personal",
  contextEventId: "evt-1",
});
assert.ok(bind.graphId.startsWith("composer:"));
assert.equal(bind.goalKo, "테스트");

const bindTurn1 = bindSituation({
  kind: "text",
  text: "오사카 여행",
  surface: "composer",
  layerMode: "personal",
  contextEventId: "evt-trip",
});
const bindTurn2 = bindSituation({
  kind: "text",
  text: "오사카",
  surface: "composer",
  layerMode: "personal",
  contextEventId: "evt-trip",
});
assert.equal(
  bindTurn1.graphId,
  bindTurn2.graphId,
  "composer follow-up must reuse the same graphId",
);

console.log("test-dispatch-context-run-composer: ok");
