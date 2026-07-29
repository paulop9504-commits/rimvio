/**
 * Place search anchor + live API wiring.
 * Run: npx tsx --env-file=.env.local scripts/test-live-place-search-api-bridge.ts
 */

import assert from "node:assert/strict";
import { resolvePlaceSearchAnchor } from "@/lib/search-engine/resolve-place-search-anchor";
import { shouldUsePlaceSearchApiBridge } from "@/lib/search-engine/fetch-place-search-via-api";
import { runPlaceSearchAsync } from "@/lib/search-engine/run-place-search-async";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";

async function main() {
  assert.equal(shouldUsePlaceSearchApiBridge(), false, "server must not bridge");

  const tokyo = resolvePlaceSearchAnchor({
    query: "숙소 찾아줘",
    contextLabelKo: "도쿄",
  });
  assert.ok(tokyo, "도쿄 label must resolve");
  assert.ok(tokyo!.lat > 35 && tokyo!.lat < 36);
  assert.ok(tokyo!.lng > 139 && tokyo!.lng < 140);

  const fromInput = resolvePlaceSearchAnchor({
    anchorLat: 34.67,
    anchorLng: 135.5,
    contextLabelKo: "도쿄",
  });
  assert.equal(fromInput?.via, "input");
  assert.equal(fromInput?.lat, 34.67);

  console.log("google", isGooglePlacesConfigured(), "lite", isLiteApiConfigured());
  assert.ok(
    isGooglePlacesConfigured() || isLiteApiConfigured(),
    "need at least one live provider in .env.local",
  );

  const hits = await runPlaceSearchAsync({
    query: "숙소",
    domain: "lodging",
    contextLabelKo: "도쿄",
    limit: 3,
  });
  assert.ok(hits.length > 0, `expected Tokyo lodging hits, got ${hits.length}`);
  console.log(
    "tokyo lodging",
    hits.map((h) => `${h.labelKo}@${h.source}`),
  );

  const eatery = await runPlaceSearchAsync({
    query: "맛집",
    domain: "eatery",
    contextLabelKo: "오사카",
    limit: 3,
  });
  assert.ok(eatery.length > 0, `expected Osaka eatery hits, got ${eatery.length}`);
  console.log(
    "osaka eatery",
    eatery.map((h) => `${h.labelKo}@${h.source}`),
  );

  console.log("OK — live place search api bridge");
}

void main();
