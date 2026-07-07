#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { classifyPlaceCategory } from "../lib/globe/context-condition-ai/discovery-guard/classify-place-category";
import { verifyDiscoveryResults } from "../lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";
import { isFollowUpDiscoveryTurn } from "../lib/globe/context-condition-ai/is-cross-domain-discovery-search";
import type { ContextConditionRecommendation } from "../lib/globe/context-condition-ai/local-discovery-action-types";

let passed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected, label);
  passed += 1;
}

// --- classifier ---
check(
  "puzzle cafe → cafe",
  classifyPlaceCategory({ name: "謎解き はてな珈琲店", categoryLabel: "카페,디저트" }),
  "cafe",
);
check(
  "google cafe type → cafe",
  classifyPlaceCategory({ name: "MOTO COFFEE", categoryLabel: "cafe" }),
  "cafe",
);
check(
  "hotel → lodging",
  classifyPlaceCategory({ name: "호텔 브라이트 시티 오사카", categoryLabel: "숙박>호텔" }),
  "lodging",
);
check(
  "google lodging type → lodging",
  classifyPlaceCategory({ name: "Bright City", categoryLabel: "lodging point_of_interest" }),
  "lodging",
);
check(
  "USJ → theme_park",
  classifyPlaceCategory({ name: "유니버설 스튜디오 재팬", categoryLabel: "amusement_park tourist_attraction" }),
  "theme_park",
);
check(
  "museum",
  classifyPlaceCategory({ name: "오사카 과학관", categoryLabel: "museum" }),
  "museum",
);
check(
  "aquarium → museum bucket",
  classifyPlaceCategory({ name: "가이유칸", categoryLabel: "aquarium" }),
  "museum",
);
check(
  "pharmacy → amenity",
  classifyPlaceCategory({ name: "마츠모토 약국", categoryLabel: "pharmacy drugstore" }),
  "amenity",
);
check(
  "restaurant",
  classifyPlaceCategory({ name: "이치란 라멘", categoryLabel: "음식점>일식>라멘" }),
  "restaurant",
);
check(
  "attraction observatory",
  classifyPlaceCategory({ name: "우메다 스카이빌딩", categoryLabel: "관광,명소 전망대" }),
  "attraction",
);
check(
  "no signal → unknown",
  classifyPlaceCategory({ name: "ABC" }),
  "unknown",
);

// --- verifier: activity is strict, drops cafe/hotel, keeps attractions ---
type Item = { row: { name: string; categoryLabel?: string | null } };
const activityPool: Item[] = [
  { row: { name: "謎解き はてな珈琲店", categoryLabel: "카페" } },
  { row: { name: "호텔 브라이트 시티", categoryLabel: "lodging" } },
  { row: { name: "유니버설 스튜디오", categoryLabel: "amusement_park" } },
  { row: { name: "우메다 스카이빌딩", categoryLabel: "tourist_attraction" } },
];
const activityGuard = verifyDiscoveryResults({ domain: "activity", items: activityPool });
check(
  "activity keeps only attractions",
  activityGuard.kept.map((i) => i.row.name).sort(),
  ["우메다 스카이빌딩", "유니버설 스튜디오"],
);
check("activity drops cafe/hotel", activityGuard.removed.length, 2);
check("activity not emptied", activityGuard.emptiedByGuard, false);

// activity with ONLY cafe/hotel → emptied (caller answers conversationally)
const activityJunk = verifyDiscoveryResults({
  domain: "activity",
  items: [
    { row: { name: "카페A", categoryLabel: "cafe" } },
    { row: { name: "호텔B", categoryLabel: "lodging" } },
  ],
});
check("activity all-junk emptied", activityJunk.emptiedByGuard, true);

// focus rescue: unknown category but name matches focus token
const rescue = verifyDiscoveryResults({
  domain: "activity",
  items: [{ row: { name: "유니버설 시티워크", categoryLabel: null } }],
  focusTokens: ["유니버설"],
});
check("focus rescues unknown-category match", rescue.kept.length, 1);

// but a contradictory category is NOT rescued by a focus token
const noRescue = verifyDiscoveryResults({
  domain: "activity",
  items: [{ row: { name: "유니버설 카페", categoryLabel: "cafe" } }],
  focusTokens: ["유니버설"],
});
check("focus does not rescue a cafe for activity", noRescue.kept.length, 0);

// --- verifier: eatery is flexible, keeps adjacent + unknown ---
const eateryPool: Item[] = [
  { row: { name: "이치란 라멘", categoryLabel: "restaurant" } },
  { row: { name: "블루보틀", categoryLabel: "cafe" } },
  { row: { name: "그랜드몰 푸드코트", categoryLabel: "shopping_mall" } },
  { row: { name: "정체불명", categoryLabel: null } },
  { row: { name: "호텔C", categoryLabel: "lodging" } },
];
const eateryGuard = verifyDiscoveryResults({ domain: "eatery", items: eateryPool });
check(
  "eatery keeps restaurant/cafe/adjacent/unknown",
  eateryGuard.kept.map((i) => i.row.name).sort(),
  ["그랜드몰 푸드코트", "블루보틀", "이치란 라멘", "정체불명"],
);
check("eatery drops lodging only", eateryGuard.removed.map((i) => i.row.name), ["호텔C"]);

// --- verifier: amenity strict ---
const amenityGuard = verifyDiscoveryResults({
  domain: "amenity",
  items: [
    { row: { name: "마츠모토 약국", categoryLabel: "pharmacy" } },
    { row: { name: "스타벅스", categoryLabel: "cafe" } },
  ],
});
check("amenity keeps pharmacy only", amenityGuard.kept.map((i) => i.row.name), ["마츠모토 약국"]);

// --- domain switch: activity after a cafe/hotel briefing is a FRESH intent ---
const priorBriefing: ContextConditionRecommendation[] = [
  { kind: "eatery", title: "MOTO COFFEE", reasonKo: "", rank: 1, placeId: "a", lat: 0, lng: 0 },
  { kind: "lodging", title: "호텔", reasonKo: "", rank: 2, placeId: "b", lat: 0, lng: 0 },
];
check(
  "놀거리 after cafe/hotel briefing is not a follow-up",
  isFollowUpDiscoveryTurn("놀거리 추천해줘", priorBriefing),
  false,
);
check(
  "약국 after cafe/hotel briefing is not a follow-up",
  isFollowUpDiscoveryTurn("근처 약국 찾아줘", priorBriefing),
  false,
);

console.log(`test-discovery-category-guard: ok (${passed} checks)`);
