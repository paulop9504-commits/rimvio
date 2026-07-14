/**
 * Min review count gate — thin 5★ stacks must not win MAIN when denser exist.
 * Run: npx tsx scripts/test-min-review-count-gate.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_MIN_PLACE_REVIEW_COUNT,
  filterByMinReviewCountProgressive,
  passesMinReviewCountGate,
} from "../lib/places/min-review-count-gate";
import {
  cuisineLocaleQueryHints,
  isConcreteCuisineEateryFocus,
  parseSingleCuisineFocus,
} from "../lib/globe/context-condition-ai/parse-cuisine-candidates";

assert.equal(DEFAULT_MIN_PLACE_REVIEW_COUNT, 50);

assert.equal(
  passesMinReviewCountGate({ reviewCount: 3, source: "google_places" }),
  false,
  "3 reviews @ any stars — exclude at hard floor",
);
assert.equal(
  passesMinReviewCountGate({ reviewCount: 50, source: "google_places" }),
  true,
);
assert.equal(
  passesMinReviewCountGate({
    reviewCount: null,
    source: "google_places",
    minCount: 50,
  }),
  false,
  "Google unknown fails hard floor",
);

{
  const rows = [
    { id: "a", reviewCount: 3, source: "google_places" },
    { id: "b", reviewCount: 12, source: "google_places" },
    { id: "c", reviewCount: 80, source: "google_places" },
  ];
  const preferred = filterByMinReviewCountProgressive(rows, (row) => row);
  assert.deepEqual(
    preferred.map((row) => row.id),
    ["c"],
    "prefer 50+ when available",
  );
}

{
  const thinOnly = [
    { id: "a", reviewCount: 3, source: "google_places" },
    { id: "b", reviewCount: 18, source: "google_places" },
  ];
  const softened = filterByMinReviewCountProgressive(thinOnly, (row) => row);
  assert.deepEqual(
    softened.map((row) => row.id),
    ["b"],
    "soft floor 20 when no 50+",
  );
}

{
  const emptyIfHard = [
    { id: "x", reviewCount: null, source: "google_places" },
    { id: "y", reviewCount: 9, source: "google_places" },
  ];
  const keep = filterByMinReviewCountProgressive(emptyIfHard, (row) => row);
  assert.deepEqual(
    keep.map((row) => row.id),
    ["y"],
    "8+ counted before admitting unknowns",
  );
}

{
  const unknownOnly = [
    { id: "x", reviewCount: null, source: "google_places" },
    { id: "z", reviewCount: 2, source: "google_places" },
  ];
  const keep = filterByMinReviewCountProgressive(unknownOnly, (row) => row);
  assert.deepEqual(keep.map((row) => row.id), ["x"]);
}

assert.equal(parseSingleCuisineFocus("초밥"), "스시 초밥");
assert.ok(isConcreteCuisineEateryFocus("초밥"));
assert.ok(cuisineLocaleQueryHints("초밥").includes("寿司"));

console.log("test-min-review-count-gate: ok");
