#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "@/lib/events/event-store";
import {
  buildCanonicalPlaceProfile,
  stampCanonicalPlaceProfile,
} from "@/lib/globe/canonical-place-profile";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
  CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY,
  type ContextEateryInventoryRow,
} from "@/lib/globe/eatery/eatery-resource-types";
import {
  readEateryRecommendReason,
  writeEateryRecommendReasons,
} from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import { invalidateEateryContextStateForPlaceShift } from "@/lib/globe/eatery/invalidate-eatery-context-state";
import { readPinnedEateryResourceId } from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import { syncGlobeContextCardCoords } from "@/lib/globe/globe-context-card-coords";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

const SEOUL = { lat: 37.5665, lng: 126.978 };
const SEONGSU = { lat: 37.5446, lng: 127.0557 };
const OSAKA = { lat: 34.6937, lng: 135.5023 };

function installStorageMock() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => local.get(key) ?? null,
    setItem: (key: string, value: string) => {
      local.set(key, value);
    },
    removeItem: (key: string) => {
      local.delete(key);
    },
  };
  const sessionStorage = {
    getItem: (key: string) => session.get(key) ?? null,
    setItem: (key: string, value: string) => {
      session.set(key, value);
    },
    removeItem: (key: string) => {
      session.delete(key);
    },
  };
  Object.assign(globalThis, {
    localStorage,
    sessionStorage,
    window: {
      dispatchEvent: () => true,
      localStorage,
      sessionStorage,
    },
  });
}

function seedEvent(input: {
  id: string;
  placeLabel: string;
  lat: number;
  lng: number;
  inventory?: readonly ContextEateryInventoryRow[];
  pinnedPlaceId?: string | null;
}) {
  const stamp = new Date().toISOString();
  const profile = buildCanonicalPlaceProfile({
    lat: input.lat,
    lng: input.lng,
    label: input.placeLabel,
    anchorSource: "manual_geocode",
    confidence: 0.96,
  });
  return commitEventUpsert({
    id: input.id,
    title: input.placeLabel,
    category: "travel",
    source: "manual",
    lifecycle: "candidate",
    datetime: stamp,
    place: input.placeLabel,
    confidence: 0.9,
    metadata: {
      ...stampCanonicalPlaceProfile(
        {
          globePlaceConfirmed: true,
          globePlaceLat: input.lat,
          globePlaceLng: input.lng,
          globePlaceLabel: input.placeLabel,
          globePlaceCardLat: input.lat,
          globePlaceCardLng: input.lng,
          globePlaceCardLabel: input.placeLabel,
          ...(input.inventory
            ? {
                [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
                [CONTEXT_EATERY_INVENTORY_META_KEY]: [...input.inventory],
              }
            : {}),
          ...(input.pinnedPlaceId
            ? {
                [CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY]: input.pinnedPlaceId,
                [CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY]: `${input.id}:eatery:${input.pinnedPlaceId}`,
              }
            : {}),
        },
        profile,
      ),
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

const seoulRows: ContextEateryInventoryRow[] = [
  {
    placeId: "seoul-gukbap",
    name: "서울 국밥집",
    lat: SEOUL.lat,
    lng: SEOUL.lng,
    images: [],
    address: "서울 중구",
    provider: "mock",
    providerLabel: "Mock",
    specialReasonKo: "서울 한복판",
    specialScore: 8,
  },
];

const osakaRows: ContextEateryInventoryRow[] = [
  {
    placeId: "osaka-ramen",
    name: "난바 라멘집",
    lat: OSAKA.lat,
    lng: OSAKA.lng,
    images: [],
    address: "Namba, Osaka",
    provider: "mock",
    providerLabel: "Mock",
    specialReasonKo: "오사카 로컬",
    specialScore: 12,
  },
];

function assertPlaceShiftClearsStaleEateryState() {
  const event = seedEvent({
    id: "test-eatery-place-shift",
    placeLabel: "서울",
    lat: SEOUL.lat,
    lng: SEOUL.lng,
    inventory: seoulRows,
    pinnedPlaceId: seoulRows[0]!.placeId,
  });
  writeEateryRecommendReasons(event.id, {
    [seoulRows[0]!.placeId]: {
      score: 88,
      reasonKo: "서울 추천",
      matchReasons: ["서울 추천"],
    },
  });

  const nextProfile = buildCanonicalPlaceProfile({
    lat: OSAKA.lat,
    lng: OSAKA.lng,
    label: "오사카",
    anchorSource: "manual_geocode",
    confidence: 0.99,
  });
  const nextMeta = invalidateEateryContextStateForPlaceShift({
    event,
    nextProfile,
  });

  assert.equal(
    nextMeta[CONTEXT_EATERY_INVENTORY_META_KEY],
    undefined,
    "country-level place shift should drop stale eatery inventory",
  );
  assert.equal(
    nextMeta[CONTEXT_EATERY_HUB_ENABLED_META_KEY],
    undefined,
    "country-level place shift should invalidate stale eatery state",
  );
  assert.equal(nextMeta[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY], undefined);
  assert.equal(nextMeta[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY], undefined);
  assert.equal(
    readEateryRecommendReason(event.id, seoulRows[0]!.placeId),
    null,
    "session-scoped recommendation reasons should also clear",
  );
  const updated = syncGlobeContextCardCoords(event, "오사카", {
    lat: OSAKA.lat,
    lng: OSAKA.lng,
    label: "오사카",
    placeProfile: nextProfile,
  });
  assert.equal(updated.place, "오사카");
}

function assertNearbyPlaceShiftKeepsEateryState() {
  const event = seedEvent({
    id: "test-eatery-nearby-shift",
    placeLabel: "서울",
    lat: SEOUL.lat,
    lng: SEOUL.lng,
    inventory: seoulRows,
    pinnedPlaceId: seoulRows[0]!.placeId,
  });

  const nextMeta = invalidateEateryContextStateForPlaceShift({
    event,
    nextProfile: buildCanonicalPlaceProfile({
      lat: SEONGSU.lat,
      lng: SEONGSU.lng,
      label: "성수동",
      anchorSource: "manual_geocode",
      confidence: 0.97,
    }),
  });

  assert.ok(
    Array.isArray(nextMeta[CONTEXT_EATERY_INVENTORY_META_KEY]),
    "nearby place adjustment should keep current eatery inventory",
  );
  assert.equal(nextMeta[CONTEXT_EATERY_HUB_ENABLED_META_KEY], true);
  assert.equal(
    nextMeta[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY],
    `${event.id}:eatery:${seoulRows[0]!.placeId}`,
  );
}

function assertInventoryRefreshClearsOrphanedPinnedPlace() {
  const event = seedEvent({
    id: "test-eatery-pin-prune",
    placeLabel: "오사카",
    lat: OSAKA.lat,
    lng: OSAKA.lng,
    inventory: seoulRows,
    pinnedPlaceId: seoulRows[0]!.placeId,
  });

  const updated = commitEateryInventoryToEvent({
    event,
    inventory: osakaRows,
    inventorySource: "mock",
  });

  assert.equal(
    readPinnedEateryResourceId(updated),
    null,
    "refresh should drop pinned eatery state when the place disappears",
  );
}

function run() {
  resetEventCandidatesForTests([]);
  installStorageMock();
  assertPlaceShiftClearsStaleEateryState();
  assertNearbyPlaceShiftKeepsEateryState();
  assertInventoryRefreshClearsOrphanedPinnedPlace();
  resetEventCandidatesForTests([]);
  console.log("test-eatery-state-reset: ok");
}

run();
