#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resetEventCandidatesForTests,
  upsertEventCandidate,
} from "@/lib/events/event-store";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import {
  parseCanonicalPlaceProfile,
  readCanonicalPlaceProfileFromEvent,
} from "@/lib/globe/canonical-place-profile";
import { resolveContextLodgingDestinationAnchor } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import { runGlobeEateryDiscovery } from "@/lib/globe/eatery/run-globe-eatery-discovery";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import {
  resetPersonalGlobePinsForTests,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";

const SEOUL = {
  lat: 37.5665,
  lng: 126.978,
};

function seedOsakaTrip(): ReturnType<typeof upsertEventCandidate> {
  const stamp = new Date().toISOString();
  return upsertEventCandidate({
    id: "test-osaka-eatery-origin",
    title: "오사카 여행",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-09-01T09:00:00.000Z",
    place: "오사카",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

function metersToLat(meters: number) {
  return meters / 111_320;
}

function metersToLng(meters: number, lat: number) {
  return meters / (111_320 * Math.cos((lat * Math.PI) / 180));
}

function buildRowsNearOrigin(origin: {
  lat: number;
  lng: number;
}): ContextEateryInventoryRow[] {
  return [
    {
      placeId: "osaka-okonomiyaki",
      name: "난바 오코노미야키",
      lat: origin.lat + metersToLat(120),
      lng: origin.lng + metersToLng(80, origin.lat),
      images: [],
      address: "Namba, Osaka",
      cuisineHint: "오코노미야키",
      provider: "mock",
      providerLabel: "Mock",
      categoryLabel: "restaurant",
      specialReasonKo: "오사카 로컬 분위기",
      specialScore: 20,
      searchScore: 90,
      virtualCandidate: true,
    },
    {
      placeId: "osaka-udon",
      name: "우메다 우동집",
      lat: origin.lat - metersToLat(180),
      lng: origin.lng - metersToLng(110, origin.lat),
      images: [],
      address: "Umeda, Osaka",
      cuisineHint: "우동",
      provider: "mock",
      providerLabel: "Mock",
      categoryLabel: "restaurant",
      specialReasonKo: "가볍게 들르기 좋아요",
      specialScore: 14,
      searchScore: 82,
      virtualCandidate: true,
    },
  ];
}

function assertRowsNearAnchor(
  rows: readonly { lat: number; lng: number; name?: string; title?: string }[],
  anchor: { lat: number; lng: number },
  label: string,
) {
  assert.ok(rows.length > 0, `${label} should return candidates`);
  for (const row of rows) {
    const title = row.name ?? row.title ?? "candidate";
    assert.ok(
      haversineKm(row.lat, row.lng, anchor.lat, anchor.lng) < 50,
      `${label}: ${title} should stay near Osaka context anchor`,
    );
  }
}

function assertNoSeoulNeighborhoodLeak(
  rows: readonly { name?: string; title?: string }[],
  label: string,
) {
  for (const row of rows) {
    const title = row.name ?? row.title ?? "candidate";
    assert.ok(
      !/(홍대|신촌|연남|망원)/u.test(title),
      `${label}: ${title} should not leak Seoul neighborhood labels into fallback data`,
    );
  }
}

function seedStaleKoreaPin(eventId: string) {
  upsertPersonalGlobePin({
    pinId: `pgpin:${eventId}`,
    eventId,
    lat: SEOUL.lat,
    lng: SEOUL.lng,
    placeLabel: "서울",
    experienceTitle: "서울 출발 준비",
    photoCount: 0,
    videoCount: 0,
    createdAtIso: new Date().toISOString(),
    acl: { viewerPeerThreadIds: [] },
  });
}

function syncBrowserState(event: ReturnType<typeof upsertEventCandidate>) {
  upsertEventCandidate({
    ...event,
    metadata: { ...(event.metadata ?? {}) },
  });
  seedStaleKoreaPin(event.id);
}

function installLocalStorageMock() {
  const storage = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
  });
}

function installBrowserDiscoveryHarness(input: {
  anchor: { lat: number; lng: number };
  mode: "success" | "empty" | "far";
}) {
  const originalFetch = globalThis.fetch;
  const hadWindow = "window" in globalThis;
  const originalWindow = hadWindow ? globalThis.window : undefined;
  const requests: Array<{
    lat: number;
    lng: number;
    anchorLabel: string | null;
    placeProfileCountryCode: string | null;
    placeProfileCity: string | null;
  }> = [];

  Object.assign(globalThis, {
    window: {
      setInterval,
      clearInterval,
      dispatchEvent: () => true,
      localStorage: globalThis.localStorage,
    },
  });

  globalThis.fetch = async (inputValue) => {
    const raw =
      typeof inputValue === "string"
        ? inputValue
        : inputValue instanceof URL
          ? inputValue.toString()
          : inputValue.url;
    const url = new URL(raw, "http://localhost");
    assert.equal(url.pathname, "/api/globe/eatery-inventory");

    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const anchorLabel = url.searchParams.get("anchor");
    const placeProfile = parseCanonicalPlaceProfile(url.searchParams.get("placeProfile"));
    requests.push({
      lat,
      lng,
      anchorLabel,
      placeProfileCountryCode: placeProfile?.countryCode ?? null,
      placeProfileCity: placeProfile?.city ?? null,
    });

    assert.ok(
      haversineKm(lat, lng, input.anchor.lat, input.anchor.lng) < 50,
      "eatery inventory request must stay near Osaka anchor, not Seoul GPS",
    );
    assert.equal(placeProfile?.countryCode, "JP");
    assert.equal(placeProfile?.city, "오사카");

    if (input.mode === "empty") {
      return new Response(JSON.stringify({ error: "forced_empty" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inventory =
      input.mode === "far"
        ? buildRowsNearOrigin(SEOUL)
        : buildRowsNearOrigin({ lat, lng });

    return new Response(
      JSON.stringify({
        inventory,
        source: input.mode === "far" ? "google_places" : "mock",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  return {
    requests,
    restore() {
      globalThis.fetch = originalFetch;
      if (hadWindow) {
        Object.assign(globalThis, { window: originalWindow });
      } else {
        delete (globalThis as { window?: unknown }).window;
      }
    },
  };
}

async function run() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();
  installLocalStorageMock();

  const event = seedOsakaTrip();
  seedStaleKoreaPin(event.id);
  const profile = readCanonicalPlaceProfileFromEvent(event);
  assert.equal(profile?.countryCode, "JP");
  assert.equal(profile?.city, "오사카");
  const anchor = resolveContextLodgingDestinationAnchor(event);

  assert.ok(
    haversineKm(anchor.lat, anchor.lng, 34.6937, 135.5023) < 50,
    "travel destination anchor must stay near Osaka even with a stale Korea pin",
  );

  const fallbackHarness = installBrowserDiscoveryHarness({
    anchor,
    mode: "empty",
  });
  try {
    syncBrowserState(event);
    const loaded = await loadEateryInventoryRows({
      event,
      message: "맛집 찾기",
      lat: SEOUL.lat,
      lng: SEOUL.lng,
      preferUserLocation: true,
    });
    assert.ok(
      fallbackHarness.requests.length >= 1,
      "loader should request inventory near Osaka first",
    );
    assert.equal(
      loaded.rows.length,
      0,
      "overseas contexts should not inject KR mock eateries when provider returns empty",
    );
  } finally {
    fallbackHarness.restore();
  }

  const farResultHarness = installBrowserDiscoveryHarness({
    anchor,
    mode: "far",
  });
  try {
    syncBrowserState(event);
    const loaded = await loadEateryInventoryRows({
      event,
      message: "맛집 찾기",
      lat: SEOUL.lat,
      lng: SEOUL.lng,
      preferUserLocation: true,
    });
    assert.ok(
      farResultHarness.requests.length >= 1,
      "loader should still query provider near Osaka before applying distance guard",
    );
    assert.equal(
      loaded.rows.length,
      0,
      "far-away provider rows should be dropped without overseas mock fallback",
    );
  } finally {
    farResultHarness.restore();
  }

  const discoveryHarness = installBrowserDiscoveryHarness({
    anchor,
    mode: "success",
  });
  try {
    syncBrowserState(event);
    const outcome = await runGlobeEateryDiscovery({
      message: "맛집 찾기",
      contextEventId: event.id,
      lat: SEOUL.lat,
      lng: SEOUL.lng,
      searching: true,
    });

    assert.ok(outcome, "eatery discovery should return candidates");
    assert.ok(outcome?.session, "discovery session available");
    assert.ok(
      outcome?.session.userLat != null && outcome?.session.userLng != null,
      "discovery session should keep an origin",
    );
    assert.ok(
      haversineKm(
        outcome!.session.userLat!,
        outcome!.session.userLng!,
        anchor.lat,
        anchor.lng,
      ) < 50,
      "session origin must stay near Osaka anchor, not Seoul GPS",
    );
    assert.ok(
      discoveryHarness.requests.length >= 1,
      "eatery discovery should call the anchored inventory search",
    );
    assertRowsNearAnchor(outcome!.session.items, anchor, "discovery session");
    assertNoSeoulNeighborhoodLeak(outcome!.session.items, "discovery session");
  } finally {
    discoveryHarness.restore();
    resetPersonalGlobePinsForTests();
    resetEventCandidatesForTests();
  }

  console.log("test-context-eatery-discovery-origin: ok");
}

void run();
