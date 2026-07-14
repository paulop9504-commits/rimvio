#!/usr/bin/env npx tsx
/**
 * Accommodation hierarchy — parse, keyword, Replace across branches.
 */
import assert from "node:assert/strict";
import {
  LODGING_STAY_BRANCHES,
  LODGING_STAY_TYPES,
  lodgingStayTypeBranch,
  parseLodgingStayTypeFromText,
  resolveLodgingStaySearchKeyword,
  normalizeLodgingStayType,
  lodgingStayTypesConflict,
} from "../lib/globe/lodging/lodging-stay-types";
import { detectIntentRelationship } from "../lib/intent-engine/detect-intent-relationship";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";

assert.equal(LODGING_STAY_BRANCHES.length, 6);
assert.ok(LODGING_STAY_TYPES.length >= 30);

// Hotel branch
assert.equal(parseLodgingStayTypeFromText("캡슐호텔 찾아줘"), "capsule");
assert.equal(lodgingStayTypeBranch("capsule"), "hotel");
assert.equal(parseLodgingStayTypeFromText("공항 호텔"), "airport_hotel");
assert.equal(parseLodgingStayTypeFromText("부티크 호텔"), "boutique_hotel");
assert.equal(parseLodgingStayTypeFromText("비즈니스 호텔"), "business_hotel");
assert.equal(parseLodgingStayTypeFromText("레지던스 호텔"), "residence_hotel");

// Traditional
assert.equal(parseLodgingStayTypeFromText("료칸"), "ryokan");
assert.equal(parseLodgingStayTypeFromText("한옥스테이"), "hanok");
assert.equal(parseLodgingStayTypeFromText("마치야"), "machiya");
assert.equal(parseLodgingStayTypeFromText("템플스테이"), "temple_stay");
assert.equal(lodgingStayTypeBranch("machiya"), "traditional");

// Budget
assert.equal(parseLodgingStayTypeFromText("게스트하우스"), "guesthouse");
assert.equal(parseLodgingStayTypeFromText("호스텔"), "hostel");
assert.equal(parseLodgingStayTypeFromText("도미토리"), "dormitory");
assert.equal(parseLodgingStayTypeFromText("모텔"), "motel");
assert.equal(lodgingStayTypeBranch("dormitory"), "budget");

// Vacation rental
assert.equal(parseLodgingStayTypeFromText("풀빌라"), "pool_villa");
assert.equal(parseLodgingStayTypeFromText("빌라"), "villa");
assert.equal(parseLodgingStayTypeFromText("콘도"), "condo");
assert.equal(parseLodgingStayTypeFromText("에어비앤비"), "airbnb");
assert.equal(parseLodgingStayTypeFromText("펜션"), "pension");

// Nature
assert.equal(parseLodgingStayTypeFromText("글램핑"), "glamping");
assert.equal(parseLodgingStayTypeFromText("산장"), "cabin");
assert.equal(lodgingStayTypeBranch("glamping"), "nature");

// Local stay
assert.equal(parseLodgingStayTypeFromText("홈스테이"), "homestay");
assert.equal(parseLodgingStayTypeFromText("민박"), "bnb");
assert.equal(lodgingStayTypeBranch("bnb"), "local_stay");

// Aliases
assert.equal(normalizeLodgingStayType("condominium"), "condo");
assert.equal(normalizeLodgingStayType("mountain_hut"), "cabin");

assert.equal(
  resolveLodgingStaySearchKeyword({ message: "캡슐호텔" }),
  "캡슐호텔",
);

assert.equal(lodgingStayTypesConflict("guesthouse", "capsule"), true);
assert.equal(lodgingStayTypesConflict("capsule", "capsule"), false);

const replace = detectIntentRelationship({
  previousText: "게스트하우스 찾아줘",
  nextText: "캡슐호텔 찾아줘",
});
assert.equal(replace.relationship, "replace");
assert.equal(replace.next.kind, "capsule");

const traditionalReplace = detectIntentRelationship({
  previousText: "비즈니스 호텔",
  nextText: "마치야 찾아줘",
});
assert.equal(traditionalReplace.relationship, "replace");
assert.equal(traditionalReplace.next.kind, "machiya");

const action = resolveLocalDiscoveryAction({
  message: "캡슐호텔 찾아줘",
  previousSpec: {
    version: 1,
    resourceTypes: ["hotel"],
    transport: "walk",
    budget: "low",
    vibe: "popular",
    lodgingKind: "hostel",
    lodgingStayType: "guesthouse",
    radiusM: 800,
  },
  previousTriggerMessage: "게스트하우스 찾아줘",
  followUpTurn: true,
});
assert.equal(action.status, "ready");
if (action.status === "ready") {
  assert.equal(action.spec.lodgingStayType, "capsule");
  assert.equal(action.spec.lodgingKind, "hostel");
}

console.log("✓ lodging accommodation hierarchy");
