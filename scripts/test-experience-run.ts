#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { classifyExperienceRunIntent } from "../lib/experience-run/classify-experience-run-intent";
import { extractRunDestination } from "../lib/experience-run/classify-experience-run-intent";
import { resolveRunPlaceFromText } from "../lib/experience-run/resolve-run-place-from-text";
import {
  isTravelTripAnnouncement,
} from "../lib/action-chat/try-travel-trip-announcement";

assert.ok(isTravelTripAnnouncement("내일 부산 출장"));
const tripIntent = classifyExperienceRunIntent("내일 부산 출장");
assert.ok(tripIntent);
assert.equal(tripIntent.profile, "business_trip");
assert.equal(tripIntent.needsClarify, false);
assert.equal(tripIntent.destination, "부산");

const vague = classifyExperienceRunIntent("출장 왔어요");
assert.ok(vague);
assert.equal(vague.needsClarify, true);
assert.ok(vague.clarifyPromptKo?.includes("둔산동"));

const dunsan = resolveRunPlaceFromText("둔산동 근처");
assert.ok(dunsan);
assert.ok(dunsan.placeLabel.includes("둔산"));
assert.equal(extractRunDestination("둔산동 근처"), dunsan.placeLabel);

const lodging = classifyExperienceRunIntent("해운대 근처 숙소 추천해줘");
assert.ok(lodging);
assert.equal(lodging.profile, "lodging_search");

const eatery = classifyExperienceRunIntent("강남 맛집 추천해줘");
assert.ok(eatery);
assert.equal(eatery.profile, "eatery_search");
assert.equal(eatery.needsClarify, false);

const vagueEatery = classifyExperienceRunIntent("맛집 추천해줘");
assert.ok(vagueEatery);
assert.equal(vagueEatery.profile, "eatery_search");
assert.equal(vagueEatery.needsClarify, true);

const travelEatery = classifyExperienceRunIntent("오사카 여행 가는데 난바 근처 맛집 추천해줘");
assert.ok(travelEatery);
assert.equal(travelEatery.profile, "leisure_travel");
assert.equal(travelEatery.destination, "오사카");
assert.equal(travelEatery.needsClarify, true);

const recall = classifyExperienceRunIntent("민수랑 저번에 어디 갔었지");
assert.equal(recall, null);

assert.equal(extractRunDestination("도쿄로 출장 간다"), "도쿄");

console.log("test-experience-run: ok");
