#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resolvePortalMarketSuggestionFromEvent } from "../lib/portal/resolve-portal-market-suggestion";

function event(partial: Partial<EventCandidate> & Pick<EventCandidate, "id" | "title">): EventCandidate {
  return {
    place: "",
    datetime: "2026-06-26T10:00:00+09:00",
    category: "experience",
    metadata: {},
    ...partial,
  };
}

function main() {
  const seekingEvent = event({ id: "ev-buy", title: "아이폰15 구매" });
  const createSuggestion = resolvePortalMarketSuggestionFromEvent(seekingEvent);
  assert.ok(createSuggestion);
  assert.equal(createSuggestion!.kind, "create_projection");
  assert.equal(createSuggestion!.role, "seeking");
  assert.equal(createSuggestion!.portalIntentId, "seek");
  assert.equal(createSuggestion!.productName, "아이폰15");

  const listingEvent = event({ id: "ev-sell", title: "아이폰15 프로 팝니다 70만원" });
  const listingSuggestion = resolvePortalMarketSuggestionFromEvent(listingEvent);
  assert.ok(listingSuggestion);
  assert.equal(listingSuggestion!.role, "listing");
  assert.equal(listingSuggestion!.portalIntentId, "offer");

  assert.equal(
    resolvePortalMarketSuggestionFromEvent(event({ id: "ev-cafe", title: "성수 카페" })),
    null,
  );

  console.log("test-portal-market-suggestion: ok");
}

main();
