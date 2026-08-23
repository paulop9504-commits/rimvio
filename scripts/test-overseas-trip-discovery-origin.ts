/**
 * Overseas trip discovery — search origin must follow destination, not viewer GPS.
 * Run: npx tsx scripts/test-overseas-trip-discovery-origin.ts
 */

import assert from "node:assert/strict";
import { resolveRestaurantCountryBias } from "../lib/restaurant-search/search-restaurants";
import { looksLikeOsakaContext, searchOsakaDemoCatalog } from "../lib/search-engine/osaka-demo-catalog";
import { resolveTripContextAnchor } from "../lib/experience-run/resolve-trip-context-anchor";

{
  const anchor = resolveTripContextAnchor("오사카");
  assert.ok(anchor);
  assert.ok(anchor!.lat >= 34.5 && anchor!.lat <= 34.85);
  assert.ok(anchor!.lng >= 135.35 && anchor!.lng <= 135.65);
}

{
  const bias = resolveRestaurantCountryBias({
    query: "오사카 맛집",
    anchorLabel: "오사카",
    countryBias: null,
    origin: { lat: 37.4979, lng: 127.0276 },
  });
  assert.equal(bias, "jp");
}

{
  assert.ok(looksLikeOsakaContext({ query: "오사카 4박5일 여행" }));
  const catalog = searchOsakaDemoCatalog({
    query: "오사카 맛집",
    domain: "eatery",
    limit: 4,
    anchorLat: 34.6937,
    anchorLng: 135.5023,
  });
  assert.ok(catalog && catalog.length >= 1);
  assert.ok(
    catalog!.every(
      (row) =>
        !/(서령|면서울|정식당|성수|강남)/u.test(row.labelKo),
    ),
    `expected Osaka catalog, got ${catalog!.map((r) => r.labelKo).join(", ")}`,
  );
}

console.log("test-overseas-trip-discovery-origin: ok");
