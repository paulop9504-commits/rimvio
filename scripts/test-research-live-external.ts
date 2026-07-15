/**
 * Live external SSOT — Places + LiteAPI merge even without scout inventory.
 */
import assert from "node:assert/strict";
import {
  createLiveExternalCandidateProvider,
  mergeLodgingPlacesWithRates,
  resolveResearchLiveSurfaces,
  runResearchEngine,
} from "../lib/research-engine";
import type { LiveInventoryRow } from "../lib/research-engine/live-external-ssot";

function mockFetch(url: string): Promise<Response> {
  const u = String(url);
  if (u.includes("/api/globe/lodging-inventory") && u.includes("keyword=")) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          ok: true,
          source: "google_places",
          inventory: [
            {
              placeId: "ChLive1",
              name: "Live Capsule Shinjuku",
              lat: 35.6938,
              lng: 139.7034,
              rating: 4.4,
              reviewCount: 180,
              address: "Shinjuku",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }
  if (u.includes("/api/globe/lodging-inventory") && !u.includes("keyword=")) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          ok: true,
          source: "liteapi",
          inventory: [
            {
              placeId: "lite:1",
              name: "Live Capsule Shinjuku",
              lat: 35.6938,
              lng: 139.7034,
              priceKrw: 88_000,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }
  if (u.includes("/api/globe/lodging-preview-video")) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          preview: { confidence: 0.96, title: "Shinjuku capsule tour" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }
  return Promise.resolve(new Response("{}", { status: 404 }));
}

async function main() {
  assert.deepEqual(resolveResearchLiveSurfaces("호텔 어디가 좋아?"), ["lodging"]);
  assert.ok(
    resolveResearchLiveSurfaces("호텔이랑 맛집 추천해").includes("eatery"),
  );

  const places: LiveInventoryRow[] = [
    {
      placeId: "A",
      name: "Hotel A",
      lat: 1,
      lng: 2,
      rating: 4,
      reviewCount: 50,
      source: "google_places",
      surface: "lodging",
    },
  ];
  const rates: LiveInventoryRow[] = [
    {
      placeId: "B",
      name: "Hotel A",
      lat: 1,
      lng: 2,
      priceKrw: 75_000,
      source: "liteapi",
      surface: "lodging",
    },
  ];
  const merged = mergeLodgingPlacesWithRates(places, rates);
  assert.equal(merged[0]?.priceKrw, 75_000);
  assert.equal(merged[0]?.source, "liteapi");

  const provider = createLiveExternalCandidateProvider({
    message: "신주쿠 하루 10만원대 호텔 어디가 좋아?",
    lat: 35.6938,
    lng: 139.7034,
    enrichYt: true,
    fetchImpl: mockFetch as typeof fetch,
  });

  const rows = await provider.listCandidates({
    queries: ["신주쿠 호텔 어디가 좋아?"],
    limit: 6,
  });
  assert.ok(rows.length >= 1, "live provider should return Places rows");
  assert.ok(rows[0]?.metadata?.liveSsot === true);
  assert.ok((rows[0]?.reviewCount ?? 0) >= 100);
  assert.equal(rows[0]?.metadata?.priceKrw, 88_000);
  assert.ok(
    typeof rows[0]?.metadata?.youtubeConfidence === "number" &&
      (rows[0]!.metadata!.youtubeConfidence as number) >= 0.9,
  );

  const engine = await runResearchEngine({
    text: "신주쿠 하루 10만원대 호텔 어디가 좋아?",
    provider,
    anchorLat: 35.6938,
    anchorLng: 139.7034,
    maxNightlyPriceKrw: 100_000,
    toolRuntime: {
      async fetchPlacesDetails() {
        return {
          rating: 4.4,
          reviewCount: 180,
          lat: 35.6938,
          lng: 139.7034,
          priceKrw: 88_000,
        };
      },
      async fetchYtPreview() {
        return { confidence: 0.96, videoTitle: "tour" };
      },
    },
  });

  assert.ok(engine.sourcesUsed.some((s) => /live\./iu.test(s.domain)));
  assert.ok(engine.confidence >= 0.45);

  console.log(
    `✓ live external SSOT — candidates=${rows.length} conf=${(engine.confidence * 100).toFixed(0)} yt=${rows[0]?.metadata?.youtubeConfidence}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
