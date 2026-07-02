#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { bindSituation } from "../lib/context-run/bind-situation";
import { planContextRun } from "../lib/context-run/plan-context-run";
import { commitMarketCompletionTrace } from "../lib/globe/market/commit-market-completion-trace";
import {
  buildCoordinationLogSummary,
  buildNegotiationSummaryKo,
  buildNegotiationTraceContext,
} from "../lib/globe/market/build-negotiation-trace-context";
import {
  buildMarketCompletionTraceDraft,
  marketCompletionEventId,
} from "../lib/globe/market/build-market-completion-trace-draft";
import { MARKET_COMPLETION_META_KEY } from "../lib/globe/market/market-completion-pinned-store";
import {
  marketCompletionSearchBlob,
  readMarketCompletionMeta,
} from "../lib/globe/market/market-completion-metadata";
import type { MarketHandshakeRecord } from "../lib/globe/market/market-handshake-types";
import { parsePersonalContextQuery } from "../lib/personal-context-ask/parse-personal-context-query";
import { resolvePersonalContextAsk } from "../lib/personal-context-ask/resolve-personal-context-ask";
import { buildRecallEventSnapshot } from "../lib/recall/recall-event-snapshot";

function handshake(partial: Partial<MarketHandshakeRecord> = {}): MarketHandshakeRecord {
  return {
    id: "hs-11111111-2222-3333-4444-555555555555",
    seekingIntentId: "s1",
    listingIntentId: "l1",
    seekingUserId: "user-seeking",
    listingUserId: "user-listing",
    threadId: "thread-1",
    phase: "completed",
    alignmentScore: 0.9,
    priorityHint: "배터리 · 가격",
    listingAcceptedAtIso: null,
    buyerStartedAtIso: null,
    seekingConfirmedAtIso: null,
    listingConfirmedAtIso: null,
    realizedPriceKrw: 1_200_000,
    completedAtIso: "2025-08-15T12:00:00.000Z",
    createdAtIso: "2025-08-10T10:00:00+09:00",
    updatedAtIso: "2025-08-15T12:00:00+09:00",
    tradeStatus: "completed",
    meetMode: "in_person",
    meetAtIso: null,
    meetPlaceLabel: "강남역",
    meetLat: null,
    meetLng: null,
    guestShareLocation: false,
    guestLat: null,
    guestLng: null,
    guestLocationAtIso: null,
    scheduleCandidates: [],
    preferredMeetDateKey: null,
    preferredMeetAtIso: null,
    schedulingExpiresAtIso: null,
    tradeCancelReasonId: null,
    tradeCancelledAtIso: null,
    ...partial,
  };
}

const negotiation = buildNegotiationTraceContext({
  productName: "맥북 프로 14",
  priceLine: "120만원",
  viewerRole: "listing",
  realizedPriceKrw: 1_200_000,
  proposal: {
    priceKo: "120만원",
    meetTimeKo: "토요일 오후",
    meetPlaceKo: "강남역",
  },
  filledSlots: {
    max_price_krw: "120만원",
    meet_time_label: "토요일 오후",
  },
  log: [
    {
      type: "agent",
      side: "self",
      role: "listing",
      text: "120만원에 넘기면 바로 만날 수 있어요.",
      atIso: "2025-08-12T10:00:00.000Z",
    },
    {
      type: "system",
      text: "양쪽 모두 승인했어요.",
      atIso: "2025-08-12T10:05:00.000Z",
    },
  ],
});

assert.ok(negotiation.negotiationSummaryKo.includes("맥북 프로 14"));
assert.equal(negotiation.realizedPriceKrw, 1_200_000);
assert.ok(buildCoordinationLogSummary([
  {
    type: "agent",
    side: "self",
    role: "listing",
    text: "120만원에 넘기면 바로 만날 수 있어요.",
    atIso: "2025-08-12T10:00:00.000Z",
  },
  {
    type: "system",
    text: "양쪽 모두 승인했어요.",
    atIso: "2025-08-12T10:05:00.000Z",
  },
]).includes("승인"));

const summary = buildNegotiationSummaryKo({
  productName: "맥북 프로 14",
  proposal: negotiation.proposal,
  filledSlots: negotiation.filledSlots,
  realizedPriceKrw: negotiation.realizedPriceKrw,
  priceLine: negotiation.priceLine,
  viewerRole: "listing",
});
assert.ok(summary.includes("120만원"));

const traceDraft = buildMarketCompletionTraceDraft({
  handshake: handshake(),
  viewerRole: "listing",
  viewerUserId: "user-listing",
  productName: "맥북 프로 14",
  priceLine: "120만원",
  placeLabel: "강남역",
  lat: 37.5,
  lng: 127.0,
  negotiation,
});
assert.equal(traceDraft.realizedPriceKrw, 1_200_000);
assert.ok(traceDraft.negotiationSummaryKo?.includes("맥북"));

const event = commitMarketCompletionTrace({
  trace: traceDraft,
  threadId: "thread-1",
});
const meta = readMarketCompletionMeta(event);
assert.ok(meta);
assert.equal(meta.handshakeId, handshake().id);
assert.equal(meta.productName, "맥북 프로 14");
assert.equal(meta.realizedPriceKrw, 1_200_000);
assert.ok(meta.negotiationSummaryKo?.includes("넘김"));
assert.ok(marketCompletionSearchBlob(meta).includes("맥북"));

const now = new Date("2026-06-10T14:00:00.000Z");
const snapshot = buildRecallEventSnapshot(event, now);
assert.equal(snapshot.marketCompletion, true);
assert.ok(snapshot.marketTokens.some((token) => token.includes("맥북") || token === "프로"));

const parsed = parsePersonalContextQuery("작년 맥북 얼마에 팔았지?", now);
assert.equal(parsed.intent, "sell_price_recall");
assert.ok(parsed.productNeedles.includes("맥북"));
assert.equal(parsed.year, 2025);

const recallPlan = planContextRun(
  bindSituation({
    kind: "text",
    text: "작년 맥북 얼마에 팔았지?",
    surface: "composer",
    layerMode: "personal",
    contextEventId: null,
  }),
);
assert.equal(recallPlan.kind, "personal_context_ask");

const result = resolvePersonalContextAsk({
  query: "작년 맥북 얼마에 팔았지?",
  events: [event],
  scope: "personal",
  now,
});
assert.equal(result.kind, "bridges");
assert.equal(result.hits[0]?.eventId, event.id);
assert.ok(result.summaryKo.includes("맥북"));
assert.ok(result.summaryKo.includes("120만원"));
assert.ok(result.narrativeKo.includes("넘겼"));

const empty = resolvePersonalContextAsk({
  query: "작년 아이패드 얼마에 팔았지?",
  events: [event],
  scope: "personal",
  now,
});
assert.equal(empty.kind, "empty");

const eventId = marketCompletionEventId(handshake().id, "user-listing");
assert.equal(traceDraft.eventId, eventId);
assert.ok(event.metadata?.[MARKET_COMPLETION_META_KEY]);

console.log("test-market-trace-recall: ok");
