#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildCanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { inferContextTitleMeaning } from "@/lib/context-title/infer-context-title";

const seoulAnchor = buildCanonicalPlaceProfile({
  lat: 37.5665,
  lng: 126.978,
  label: "서울",
  anchorSource: "fallback",
  confidence: 0.8,
});

const familyTrip = inferContextTitleMeaning({ title: "엄마랑 오사카" });
assert.equal(familyTrip.purpose, "travel");
assert.equal(familyTrip.companionMode, "parent");
assert.equal(familyTrip.primaryPlaceHint?.label, "오사카");
assert.equal(familyTrip.searchBias.comfortBias, "comfort");
assert.equal(familyTrip.searchBias.mobilityBias, "low");

const lateMeal = inferContextTitleMeaning({ title: "첫날 야식" });
assert.equal(lateMeal.purpose, "meal");
assert.ok(lateMeal.timeCues.includes("first_day"));
assert.ok(lateMeal.timeCues.includes("late_night"));
assert.equal(lateMeal.searchBias.mealMoment, "late_night");
assert.equal(lateMeal.searchBias.proximityBias, "anchor_tight");

const businessTrip = inferContextTitleMeaning({
  title: "대전 외근",
  anchorProfile: seoulAnchor,
});
assert.equal(businessTrip.purpose, "business_trip");
assert.equal(businessTrip.primaryPlaceHint?.label, "대전");
assert.equal(businessTrip.searchBias.comfortBias, "practical");
assert.equal(businessTrip.conflict.severity, "soft");
assert.ok(businessTrip.conflict.reasons.includes("anchor_distance_mismatch"));

const socialMeet = inferContextTitleMeaning({ title: "민수 만나는 날" });
assert.equal(socialMeet.purpose, "meeting");
assert.equal(socialMeet.companionMode, "named_person");
assert.ok(socialMeet.peopleHints.includes("민수"));
assert.ok(socialMeet.timeCues.includes("meeting_day"));

console.log("test-context-title-inference: ok");
