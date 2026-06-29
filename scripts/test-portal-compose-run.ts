#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { bindSituation } from "../lib/context-run/bind-situation";
import { planContextRun } from "../lib/context-run/plan-context-run";
import type { ContextRunIngress } from "../lib/context-run/ingress-types";
import { detectPortalIntentFromText } from "../lib/portal/detect-portal-intent-from-text";
import { resetPortalComposeRunStoreForTests } from "../lib/portal/portal-compose-run-store";
import { resolvePortalComposeRunTurn } from "../lib/portal/resolve-portal-compose-run-turn";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

function planFor(text: string, surface: "composer" | "capture_sheet" = "composer") {
  const ingress: ContextRunIngress = {
    kind: "text",
    text,
    surface,
    layerMode: "personal",
    contextEventId: null,
  };
  return planContextRun(bindSituation(ingress));
}

resetPortalComposeRunStoreForTests();

const offer = detectPortalIntentFromText("동네에 에어팟 내놓고 싶어");
assert.ok(offer);
assert.equal(offer?.intentId, "offer");

const seek = detectPortalIntentFromText("맥북 구해요");
assert.equal(seek?.intentId, "seek");

const together = detectPortalIntentFromText("주말에 러닝 같이 할 사람");
assert.equal(together?.intentId, "together");
assert.equal(together?.categoryId, "sport");

const join = detectPortalIntentFromText("이번 주말 공연 참여하고 싶어");
assert.equal(join?.intentId, "join");

assert.equal(planFor("아이폰 팔고 싶어").kind, "portal_compose_run");
assert.equal(planFor("주말 스터디 같이해요", "capture_sheet").kind, "portal_compose_run");
assert.equal(planFor("호텔 추천해줘").kind, "experience_run");

const event = commitEventUpsert({
  id: "ec-portal-run-test",
  title: "에어팟 내놓기",
  category: "custom",
  source: "message",
  lifecycle: "draft",
  confidence: 0.8,
});

const clarify = resolvePortalComposeRunTurn({
  graphId: "composer:test",
  intentId: "offer",
  categoryId: "used_goods",
  message: "동네에 에어팟 내놓고 싶어",
  eventId: event.id,
});
assert.equal(clarify.kind, "clarify");
assert.ok(clarify.kind === "clarify" && clarify.questionKo.length > 0);

const social = resolvePortalComposeRunTurn({
  graphId: "composer:social",
  intentId: "together",
  categoryId: "sport",
  message: "러닝 같이",
  eventId: event.id,
});
assert.equal(social.kind, "clarify");

console.log("test-portal-compose-run: ok");
