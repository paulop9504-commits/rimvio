/**
 * Named Research tools — registry + inventory match + gap→pick.
 */
import assert from "node:assert/strict";
import {
  RESEARCH_TOOL_REGISTRY,
  detectResearchGaps,
  getResearchTool,
  listResearchToolIds,
  matchInventoryHit,
  pickResearchTool,
  readLiveInventory,
  resolveResearchToolSurface,
} from "../lib/research-engine";

async function main() {
  const ids = listResearchToolIds();
  assert.deepEqual(
    [...ids],
    ["places_details", "rate_lookup", "distance_check", "yt_preview"],
  );
  assert.equal(RESEARCH_TOOL_REGISTRY.length, 4);
  for (const id of ids) {
    assert.ok(getResearchTool(id), `registry missing ${id}`);
  }

  assert.equal(resolveResearchToolSurface("inventory.lodging.rimvio"), "lodging");
  assert.equal(resolveResearchToolSurface("inventory.eatery.rimvio"), "eatery");
  assert.equal(resolveResearchToolSurface("discovery.activity.rimvio"), "activity");

  // API returns `inventory` — never `rows` (old bug).
  const parsed = readLiveInventory({
    ok: true,
    inventory: [
      {
        placeId: "ChX",
        name: "Nebula Capsule Hotel",
        lat: 35.69,
        lng: 139.7,
        rating: 4.2,
        reviewCount: 156,
        priceKrw: 95_000,
      },
    ],
  });
  assert.equal(parsed.length, 1);
  assert.equal(readLiveInventory({ rows: parsed }).length, 0);

  const hit = matchInventoryHit(parsed, {
    title: "Nebula Capsule",
    placeId: null,
    lat: 35.6901,
    lng: 139.7001,
  });
  assert.ok(hit);
  assert.equal(hit!.reviewCount, 156);

  const gaps = detectResearchGaps({
    ranked: [
      {
        candidate: {
          id: "c1",
          title: "Sparse Inn",
          snippet: "도심",
          domain: "inventory.lodging.rimvio",
          mediaType: "listing",
          reviewCount: null,
          popularity: null,
          metadata: { lat: 35.69, lng: 139.7 },
        },
        axes: {
          relevance: 0.5,
          freshness: 0.5,
          authority: 0.5,
          popularity: 0.2,
          trust: 0.4,
          diversity: 0.5,
          userContext: 0.5,
        },
        totalScore: 0.4,
      },
    ],
    persuasionContext: {
      message: "하루 10만원대 호텔",
      maxNightlyPriceKrw: 100_000,
      anchorLat: 35.6895,
      anchorLng: 139.6917,
    },
  });

  assert.equal(
    pickResearchTool({
      gaps: gaps.filter((g) => g.axisId === "observation"),
      tried: new Set(),
      hasCoords: true,
      hasAnchor: true,
    }),
    "places_details",
  );
  assert.equal(
    pickResearchTool({
      gaps: gaps.filter((g) => g.axisId === "priceFit"),
      tried: new Set(),
      hasCoords: true,
      hasAnchor: true,
    }),
    "rate_lookup",
  );
  assert.equal(
    pickResearchTool({
      gaps: [{ axisId: "crossCheck", reasonKo: "영상" }],
      tried: new Set(),
      hasCoords: true,
      hasAnchor: true,
    }),
    "yt_preview",
  );
  assert.equal(
    pickResearchTool({
      gaps: [{ axisId: "distance", reasonKo: "동선" }],
      tried: new Set(),
      hasCoords: true,
      hasAnchor: true,
    }),
    "distance_check",
  );

  console.log("✓ research tools — named registry + inventory match + gap→pick");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
