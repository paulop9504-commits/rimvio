import assert from "node:assert/strict";
import { extractLandmarkHintsFromText } from "../lib/globe/discovery-lens/extract-landmark-hints";
import {
  offsetLatLng,
  parseLensCommand,
} from "../lib/globe/discovery-lens/parse-lens-command";
import { buildGlobeResourceReelItemsFromLensPrefetch } from "../lib/globe/discovery-lens/build-lens-resource-reel-items";
import {
  buildDiscoveryLensPrefetchReadyAnnouncement,
  buildDiscoveryLensSpawnAnnouncement,
} from "../lib/globe/discovery-lens/build-discovery-lens-announcements";
import { buildDiscoveryLensLabelRows } from "../lib/globe/discovery-lens/build-discovery-lens-label-rows";
import { shouldShowDiscoveryLensLabels } from "../lib/globe/discovery-lens/build-discovery-lens-label-rows";
import type { DiscoveryLensSession } from "../lib/globe/discovery-lens/types";
import {
  buildResourceReelKindFilters,
  filterGlobeResourceReelItems,
  resolveResourceReelKindFilter,
  shouldExposeAmenityReelChip,
} from "../lib/globe/resource-reel/resource-reel-kind-filter";
import { parseResourceReelKindFilter } from "../lib/globe/resource-reel/parse-resource-reel-kind-filter";
import type { GlobeResourceReelItem } from "../lib/globe/resource-reel/types";
import { buildGlobeResourceReelItems } from "../lib/globe/resource-reel/build-globe-resource-reel-items";

const examples = extractLandmarkHintsFromText(
  "아이와 가족 나들이 (예: 도쿄 디즈니랜드, 우에노 동물원, teamLab Borderless)",
);
assert.equal(examples.length, 3);
assert.match(examples[0]!, /디즈니/u);

const resize = parseLensCommand("a 렌즈 반경 1km 올려");
assert.equal(resize?.kind, "resize_delta");
if (resize?.kind === "resize_delta") {
  assert.equal(resize.deltaM, 1000);
}

const select = parseLensCommand("b 렌즈");
assert.equal(select?.kind, "select");
if (select?.kind === "select") {
  assert.equal(select.lensId, "b");
}

const crowd = parseLensCommand("사람들이 많이 노는 곳으로 렌즈 이동");
assert.equal(crowd?.kind, "move_query");

const north = offsetLatLng({
  lat: 35.68,
  lng: 139.76,
  bearing: "north",
  distanceM: 1000,
});
assert.ok(north.lat > 35.68);

const reel = buildGlobeResourceReelItemsFromLensPrefetch({
  contextEventId: "evt-1",
  lensLabel: "디즈니",
  lensId: "a",
  bundle: {
    status: "ready",
    updatedAtIso: new Date().toISOString(),
    items: [
      {
        kind: "activity",
        placeId: "p1",
        title: "도쿄 디즈니랜드",
        reasonKo: "놀거리",
        lat: 35.63,
        lng: 139.88,
      },
    ],
  },
});
assert.equal(reel.length, 1);
assert.equal(reel[0]?.kind, "activity");
assert.equal(reel[0]?.contractSource?.sourceKind, "lens");
assert.equal(reel[0]?.contractSource?.sourceId, "a");

const mockSession: DiscoveryLensSession = {
  contextEventId: "evt-1",
  lenses: [
    {
      id: "a",
      labelKo: "디즈니",
      center: { lat: 35.63, lng: 139.88 },
      radiusM: 2500,
      spawnedFrom: "아이와 함께",
    },
    {
      id: "b",
      labelKo: "우에노",
      center: { lat: 35.71, lng: 139.77 },
      radiusM: 2500,
    },
    {
      id: "c",
      labelKo: "teamLab",
      center: { lat: 35.65, lng: 139.79 },
      radiusM: 2500,
    },
  ],
  activeLensId: "a",
  updatedAtIso: new Date().toISOString(),
};

const spawnKo = buildDiscoveryLensSpawnAnnouncement({
  session: mockSession,
  choice: { id: "family", label: "아이와 함께", value: "family", slot: "activityFocus" },
});
assert.match(spawnKo, /아이와 함께/u);
assert.match(spawnKo, /디즈니/u);
assert.match(spawnKo, /찾아볼게요/u);

const prefetchKo = buildDiscoveryLensPrefetchReadyAnnouncement({
  lens: mockSession.lenses[0]!,
  bundle: {
    status: "ready",
    updatedAtIso: new Date().toISOString(),
    items: [
      { kind: "activity", placeId: "p1", title: "A", reasonKo: "r", lat: 1, lng: 2 },
      { kind: "eatery", placeId: "p2", title: "B", reasonKo: "r", lat: 1, lng: 2 },
      { kind: "lodging", placeId: "p3", title: "C", reasonKo: "r", lat: 1, lng: 2 },
    ],
  },
});
assert.match(prefetchKo!, /디즈니/u);
assert.match(prefetchKo!, /놀거리 1/u);
assert.match(prefetchKo!, /맛집 1/u);
assert.match(prefetchKo!, /숙소 1/u);

const labelRows = buildDiscoveryLensLabelRows(mockSession);
assert.equal(labelRows.length, 3);
assert.match(labelRows[0]!.text, /a\. 디즈니/u);
assert.equal(labelRows[0]!.active, true);

const reelItems: GlobeResourceReelItem[] = [
  {
    resourceId: "r1",
    kind: "activity",
    placeId: "p1",
    title: "A",
    score100: 80,
    detailReasonLine: "r",
    accent: "blue",
    thumbnailUrl: null,
    lat: 1,
    lng: 2,
    carouselIndex: 0,
  },
  {
    resourceId: "r2",
    kind: "eatery",
    placeId: "p2",
    title: "B",
    score100: 80,
    detailReasonLine: "r",
    accent: "green",
    thumbnailUrl: null,
    lat: 1,
    lng: 2,
    carouselIndex: 0,
  },
  {
    resourceId: "r3",
    kind: "lodging",
    placeId: "p3",
    title: "C",
    score100: 80,
    detailReasonLine: "r",
    accent: "orange",
    thumbnailUrl: null,
    lat: 1,
    lng: 2,
    carouselIndex: 0,
  },
];
const filters = buildResourceReelKindFilters(reelItems);
assert.equal(filters.length, 4);
assert.equal(filterGlobeResourceReelItems(reelItems, "eatery").length, 1);

assert.equal(shouldExposeAmenityReelChip({ counts: { activity: 2, eatery: 2, lodging: 2, amenity: 1 } }), false);
assert.equal(shouldExposeAmenityReelChip({ counts: { activity: 0, eatery: 0, lodging: 0, amenity: 2 } }), true);

assert.equal(parseResourceReelKindFilter("맛집만"), "eatery");
assert.equal(parseResourceReelKindFilter("맛집"), null);
assert.equal(parseResourceReelKindFilter("맛집 찾아"), null);
assert.equal(parseResourceReelKindFilter("놀거리"), null);
assert.equal(parseResourceReelKindFilter("전체로 보여줘"), "all");
assert.equal(resolveResourceReelKindFilter(reelItems, "eatery"), "eatery");
assert.equal(resolveResourceReelKindFilter(reelItems, "amenity"), "amenity");
assert.equal(shouldShowDiscoveryLensLabels("city"), false);
assert.equal(shouldShowDiscoveryLensLabels("street"), true);
assert.equal(buildDiscoveryLensLabelRows(mockSession, "region").length, 0);
assert.equal(buildDiscoveryLensLabelRows(mockSession, "street").length, 3);

// Discovery reel: no trip-inventory fallback when batch/lens absent.
const bareEvent = {
  id: "evt-inventory-only",
  title: "여행 여행",
  category: "travel" as const,
  source: "user" as const,
  lifecycle: "active" as const,
  confidence: 1,
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
assert.equal(buildGlobeResourceReelItems(bareEvent).length, 0);

console.log("test-discovery-lens: ok");
