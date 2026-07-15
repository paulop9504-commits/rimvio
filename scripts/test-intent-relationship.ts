#!/usr/bin/env npx tsx
/**
 * Intent Relationship Detector + lodging checkout synthesize + capsule keyword.
 */
import assert from "node:assert/strict";
import {
  detectIntentRelationship,
  lodgingKindFromIntentSlice,
} from "../lib/intent-engine/detect-intent-relationship";
import { resolveLodgingSearchKeyword } from "../lib/globe/context-condition-ai/filter-lodging-for-intent";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { synthesizeCheckoutRoomOffer } from "../lib/globe/context-hub/derive-lodging-room-offers";
import { resolveLodgingRoomCardStep } from "../lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { CONTEXT_LODGING_INVENTORY_META_KEY, CONTEXT_LODGING_HUB_ENABLED_META_KEY } from "../lib/globe/context-hub/lodging-resource-types";

// --- Relationship ---
{
  const cont = detectIntentRelationship({
    previousText: "게스트하우스 찾아줘",
    nextText: "가격은?",
  });
  assert.equal(cont.relationship, "continue");
  assert.equal(cont.clearPriorDomainKinds, false);

  const replace = detectIntentRelationship({
    previousText: "게스트하우스 찾아줘",
    nextText: "캡슐호텔 찾아줘",
  });
  assert.equal(replace.relationship, "replace");
  assert.equal(replace.clearPriorDomainKinds, true);
  assert.equal(replace.next.kind, "capsule");
  assert.equal(lodgingKindFromIntentSlice(replace.next), "hostel");

  const merge = detectIntentRelationship({
    previousText: "게스트하우스 찾아줘",
    nextText: "료칸도 찾아줘",
  });
  assert.equal(merge.relationship, "merge");
  assert.equal(merge.mergeKinds, true);

  const weather = detectIntentRelationship({
    previousText: "게스트하우스 찾아줘",
    nextText: "오사카 날씨",
  });
  assert.equal(weather.relationship, "replace");
  assert.equal(weather.next.domain, "weather");

  // Eatery cuisine switch — Cursor Replace (말차 → 돈카츠), even with 「도 찾아」
  const cuisineReplace = detectIntentRelationship({
    previousText: "말차 아이스크림 맛집 찾아줘",
    nextText: "돈카츠 맛집도 찾아줘",
  });
  assert.equal(cuisineReplace.relationship, "replace");
  assert.equal(cuisineReplace.clearPriorDomainKinds, true);
  assert.equal(cuisineReplace.reason, "eatery_cuisine_conflict");
  assert.equal(cuisineReplace.previous?.kind, "matcha_icecream");
  assert.equal(cuisineReplace.next.kind, "tonkatsu");

  const cuisineSlot = detectIntentRelationship({
    previousText: "돈카츠 맛집 찾아줘",
    nextText: "가격은?",
  });
  assert.equal(cuisineSlot.relationship, "continue");
  assert.equal(cuisineSlot.clearPriorDomainKinds, false);
}

// --- Capsule keyword wins ---
assert.equal(
  resolveLodgingSearchKeyword({
    lodgingKind: "hostel",
    message: "캡슐호텔 찾아줘",
  }),
  "캡슐호텔",
);

// --- Replace clears prior hostel lock on local discovery ---
{
  const prior = resolveLocalDiscoveryAction({
    message: "게스트하우스 찾아줘",
  });
  assert.equal(prior.status, "ready");
  if (prior.status !== "ready") {
    throw new Error("expected ready");
  }
  assert.equal(prior.spec.lodgingKind, "hostel");

  const next = resolveLocalDiscoveryAction({
    message: "캡슐호텔 찾아줘",
    previousSpec: prior.spec,
    previousTriggerMessage: "게스트하우스 찾아줘",
    followUpTurn: true,
  });
  assert.equal(next.status, "ready");
  if (next.status === "ready") {
    assert.equal(next.spec.lodgingKind, "hostel");
  }
  const rel = detectIntentRelationship({
    previousText: "게스트하우스 찾아줘",
    nextText: "캡슐호텔 찾아줘",
  });
  assert.equal(rel.relationship, "replace");
}

// --- Checkout synthesize for Places row without roomOffers ---
{
  resetEventCandidatesForTests([]);
  const placeId = "places-guest-1";
  const event = commitEventUpsert({
    id: "rel-checkout-evt",
    title: "오사카 여행",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: new Date().toISOString(),
    metadata: {
      [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
      [CONTEXT_LODGING_INVENTORY_META_KEY]: [
        {
          placeId,
          name: "Nya-On Sonezaki Guest House",
          lat: 34.7,
          lng: 135.5,
          priceKrw: 45_000,
          images: [],
          provider: "google_places",
        },
      ],
    },
  });
  const step = resolveLodgingRoomCardStep(event, placeId);
  assert.ok(step, "room card step should exist via synthesize");
  assert.ok(step!.payload.roomOffers?.length);
  assert.ok(
    synthesizeCheckoutRoomOffer({
      row: {
        placeId,
        name: "Nya-On",
        priceKrw: 45_000,
        stayWindow: null,
        partnerLabel: null,
      },
    }),
  );
}

console.log("✓ intent relationship + checkout synthesize + capsule keyword");
