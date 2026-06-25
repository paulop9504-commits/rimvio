#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { evaluateMarketAlignmentNudge } from "../lib/globe/market/market-alignment-nudge-policy";
import type { MarketAlignmentOffer } from "../lib/globe/market/market-intent-types";

const now = new Date("2026-06-10T14:00:00.000Z");

const baseOffer: MarketAlignmentOffer = {
  selfIntentId: "mi-self",
  matchIntentId: "mi-match",
  selfEventId: "ev-self",
  matchEventId: "ev-match",
  role: "seeking",
  headline: "test",
  body: "test",
  ctaLabel: "test",
  matchLat: 37.5,
  matchLng: 127.0,
  matchPlaceLabel: "대전",
  distanceKm: 3,
  categoryId: "market.phone",
  sourceRef: "market:alignment_v1.2",
  alignmentScore: 0.8,
};

assert.equal(
  evaluateMarketAlignmentNudge({
    offer: { ...baseOffer, alignmentScore: 0.6 },
    state: { dismissedUntil: {}, intents: {} },
    sessionDismissedKey: null,
    now,
  }),
  false,
);

assert.equal(
  evaluateMarketAlignmentNudge({
    offer: baseOffer,
    state: {
      dismissedUntil: {
        "mi-match": "2026-06-20T00:00:00.000Z",
      },
      intents: {},
    },
    sessionDismissedKey: null,
    now,
  }),
  false,
);

assert.equal(
  evaluateMarketAlignmentNudge({
    offer: baseOffer,
    state: {
      dismissedUntil: {},
      intents: {
        "ev-self": {
          lastNudgeAtIso: "2026-06-10T10:00:00.000Z",
          lastNudgeScore: 0.78,
        },
      },
    },
    sessionDismissedKey: null,
    now,
  }),
  false,
);

assert.equal(
  evaluateMarketAlignmentNudge({
    offer: { ...baseOffer, alignmentScore: 0.9 },
    state: {
      dismissedUntil: {},
      intents: {
        "ev-self": {
          lastNudgeAtIso: "2026-06-10T10:00:00.000Z",
          lastNudgeScore: 0.78,
        },
      },
    },
    sessionDismissedKey: null,
    now,
  }),
  true,
);

console.log("test-market-alignment-nudge-policy: ok");
