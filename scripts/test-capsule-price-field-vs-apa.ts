#!/usr/bin/env npx tsx
/**
 * Capsule + nightly price Fields must NOT project APA Namba/Umeda demo.
 * Graph search_project defers to discovery scout; Osaka catalog skips APA.
 */
import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
  shouldDeferSearchProjectToDiscoveryScout,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import {
  filterLodgingRowsForIntent,
  parseMaxNightlyPriceKrw,
} from "../lib/globe/context-condition-ai/filter-lodging-for-intent";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { resolveLodgingMockForPlace } from "../lib/globe/context-hub/lodging-mock-inventory";
import { parseLodgingStayTypeFromText } from "../lib/globe/lodging/lodging-stay-types";
import { runPlaceSearch } from "../lib/search-engine/run-place-search";
import { searchOsakaDemoCatalog } from "../lib/search-engine/osaka-demo-catalog";

const MSG = "주변 캡슐호텔 찾아 하루에 3만원 미만으로";
const OSAKA = { lat: 34.6654, lng: 135.5019 };

assert.equal(parseLodgingStayTypeFromText(MSG), "capsule");
assert.equal(parseMaxNightlyPriceKrw(MSG), 30_000);
assert.equal(shouldDeferSearchProjectToDiscoveryScout(MSG), true);
assert.equal(shouldDeferSearchProjectToDiscoveryScout("APA호텔 찾아줘"), false);

{
  const catalog = searchOsakaDemoCatalog({
    query: MSG,
    domain: "lodging",
    anchorLat: OSAKA.lat,
    anchorLng: OSAKA.lng,
  });
  assert.equal(catalog, null);

  const apa = searchOsakaDemoCatalog({
    query: "APA 호텔 찾아줘",
    domain: "lodging",
    anchorLat: OSAKA.lat,
    anchorLng: OSAKA.lng,
  });
  assert.ok(apa && apa.length >= 1);
  assert.ok(apa!.every((h) => /APA|아파/iu.test(h.labelKo)));
}

{
  const hits = runPlaceSearch({
    query: MSG,
    domain: "lodging",
    anchorLat: OSAKA.lat,
    anchorLng: OSAKA.lng,
    limit: 4,
  });
  assert.ok(
    hits.every((h) => !/APA|아파/iu.test(h.labelKo)),
    `unexpected APA in place search: ${hits.map((h) => h.labelKo).join(", ")}`,
  );
}

{
  resetGraphCommandStoreForTests();
  clearSessionGraphs();
  const graphResult = tryRunGraphCommandOs({
    utterance: MSG,
    contextEventId: "evt-capsule-price",
    anchorLat: OSAKA.lat,
    anchorLng: OSAKA.lng,
  });
  assert.equal(
    graphResult,
    null,
    "capsule+price must defer to scout, not graph APA project",
  );
}

{
  const resolved = resolveLocalDiscoveryAction({
    message: MSG,
    lodgingConfidence: 0.9,
    budgetConfidence: 0.9,
    mobilityConfidence: 0.9,
  });
  assert.equal(resolved.status, "ready");
  if (resolved.status === "ready") {
    assert.equal(resolved.spec.lodgingStayType, "capsule");
    assert.equal(resolved.spec.maxNightlyPriceKrw, 30_000);
    assert.equal(resolved.spec.budget, "low");
    assert.ok(resolved.spec.resourceTypes.includes("hotel"));
  }
}

{
  const mock = resolveLodgingMockForPlace("오사카", OSAKA);
  const filtered = filterLodgingRowsForIntent({
    rows: [
      ...mock,
      {
        placeId: "apa-namba",
        name: "APA Hotel Osaka Namba",
        lat: OSAKA.lat,
        lng: OSAKA.lng,
        priceKrw: 180_697,
        images: [],
      },
    ],
    lodgingKind: "hostel",
    lodgingStayType: "capsule",
    budget: "low",
    maxNightlyPriceKrw: 30_000,
  });
  assert.ok(filtered.length >= 1);
  assert.ok(filtered.every((row) => (row.priceKrw ?? 0) <= 30_000));
  assert.ok(filtered.every((row) => /캡슐|capsule|ゲスト|게스트/iu.test(row.name)));
  assert.ok(filtered.every((row) => !/APA|아파/iu.test(row.name)));
}

console.log("test-capsule-price-field-vs-apa: ok");
