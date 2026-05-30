#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { recordBehaviorEvent, resetBehaviorProfileForTests } from "../lib/notification-shadow/behavior-learner";
import {
  compileShadowDashboard,
  formatShadowDashboardText,
  isShadowDashboardQuery,
} from "../lib/notification-shadow/compile-dashboard";
import { ingestExternalNotification } from "../lib/notification-shadow/ingest-adapters";
import { orchestrateShadowDashboard } from "../lib/notification-shadow/orchestrate-shadow-dashboard";
import { ingestNotification } from "../lib/notification-shadow/route-notification";
import { ruleClassifyNotification } from "../lib/notification-shadow/rule-classify";
import {
  appendShadowRecord,
  listShadowRecords,
  resetShadowStoreForTests,
} from "../lib/notification-shadow/shadow-store";

resetShadowStoreForTests();
resetBehaviorProfileForTests();

const otp = ingestNotification({
  source: "external",
  source_app: "Bank",
  title: "인증번호",
  content: "인증번호 123456",
  timestamp: new Date().toISOString(),
});
assert.equal(otp.category, "CRITICAL");
assert.equal(otp.priority_score, 100);
assert.equal(otp.route, "popup");

const delivery = ingestNotification({
  source: "external",
  source_app: "Baemin",
  title: "배달 도착",
  content: "라이더가 곧 도착합니다",
  timestamp: new Date().toISOString(),
});
assert.equal(delivery.route, "popup");
assert.ok(delivery.future_actions.some((action) => action.type === "TRACK_PACKAGE"));

const zoom = ingestNotification({
  source: "external",
  source_app: "Zoom",
  title: "투자자 미팅",
  content: "10분 후 시작됩니다",
  timestamp: new Date().toISOString(),
  fire_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  active_container: "calendar_planner",
});
assert.ok(zoom.priority_score >= 90);
assert.equal(zoom.route, "popup");
assert.ok(zoom.future_actions.some((action) => action.type === "OPEN_ZOOM"));

const zoomNoBoost = ingestNotification({
  source: "external",
  source_app: "Zoom",
  title: "투자자 미팅",
  content: "10분 후 시작됩니다",
  timestamp: new Date().toISOString(),
  fire_at: new Date(Date.now() + 10 * 60_000).toISOString(),
});
assert.equal(zoomNoBoost.route, "action_stream");

const btcNews = ingestNotification({
  source: "external",
  source_app: "News",
  title: "비트코인 급등",
  content: "BTC 5% 상승",
  timestamp: new Date().toISOString(),
  active_container: "bitcoin_trader",
});
assert.equal(btcNews.container, "bitcoin_trader");
assert.ok(btcNews.route === "shadow" || btcNews.route === "action_stream");
assert.ok(btcNews.future_actions.some((action) => action.type === "OPEN_EXCHANGE"));

const spam = ruleClassifyNotification({
  source_app: "Shop",
  title: "50% 쿠폰",
  content: "지금 구매하세요",
});
assert.equal(spam.category, "SPAM");

appendShadowRecord(zoom);
appendShadowRecord(delivery);
appendShadowRecord(btcNews);

assert.ok(listShadowRecords().length >= 3);

const dashboard = compileShadowDashboard();
assert.match(formatShadowDashboardText(dashboard), /지금 해야 할 일/);
assert.ok(isShadowDashboardQuery("오늘 중요한 거 뭐 있어?"));

const orchestrated = orchestrateShadowDashboard("오늘 중요한 거 뭐 있어?");
assert.ok(orchestrated);
assert.ok(orchestrated!.summary.includes("지금 해야 할 일"));

ingestExternalNotification({
  source_app: "Slack",
  title: "CEO mentioned you",
  content: "대표님이 멘션했습니다",
});
recordBehaviorEvent({ shadow_id: zoom.id, event: "clicked_action", response_ms: 3000 });

console.log("test-notification-shadow: ok");
