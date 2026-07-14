/**
 * Min review count gate — thin 5★ stacks must not enter MAIN discovery.
 * Run: npx tsx scripts/test-min-review-count-gate.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_MIN_PLACE_REVIEW_COUNT,
  passesMinReviewCountGate,
} from "../lib/places/min-review-count-gate";

assert.equal(DEFAULT_MIN_PLACE_REVIEW_COUNT, 50);

assert.equal(
  passesMinReviewCountGate({ reviewCount: 3, source: "google_places" }),
  false,
  "3 reviews @ any stars — exclude",
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: 49, source: "google_places" }),
  false,
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: 50, source: "google_places" }),
  true,
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: 120, source: "google_places" }),
  true,
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: null, source: "google_places" }),
  false,
  "Google without count — exclude",
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: null, source: "naver_local" }),
  true,
  "Naver unknown count — allow",
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: null, source: "liteapi" }),
  true,
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: 12, source: "naver_local" }),
  false,
  "Known thin stack always fails",
);

assert.equal(
  passesMinReviewCountGate({
    reviewCount: null,
    source: "google_places",
    knownOnly: true,
  }),
  true,
  "rank layer allows unknown counts",
);
assert.equal(
  passesMinReviewCountGate({
    reviewCount: 3,
    source: "google_places",
    knownOnly: true,
  }),
  false,
);

console.log("test-min-review-count-gate: ok");
