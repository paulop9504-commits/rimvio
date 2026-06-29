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

const urlAction = planFor("https://maps.google.com");
assert.ok(
  urlAction.kind === "external_url" || urlAction.kind === "map_intent_supply",
  `unexpected url plan: ${urlAction.kind}`,
);

const lodging = planFor("호텔 추천해줘");
assert.equal(lodging.kind, "experience_run");

const trip = planFor("부산 출장");
assert.equal(trip.kind, "experience_run");

const eatery = planFor("강남 맛집 추천");
assert.equal(eatery.kind, "experience_run");

const genericMemo = planFor("점심에 김치찌개 먹음");
assert.equal(genericMemo.kind, "map_intent_supply");

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

console.log("test-dispatch-context-run-composer: ok");
