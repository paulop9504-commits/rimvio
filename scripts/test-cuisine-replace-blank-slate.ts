/**
 * Replace cuisine → blank-slate eatery focus (말차 leftovers must not become 돈카츠).
 */
import assert from "node:assert/strict";
import type { UnifiedExperienceContext } from "../lib/experience-context/unified-experience-context-types";
import { detectIntentRelationship } from "../lib/intent-engine/detect-intent-relationship";
import {
  cuisineLocaleQueryHints,
  isConcreteCuisineEateryFocus,
  parseCuisineCandidates,
  parseSingleCuisineFocus,
} from "../lib/globe/context-condition-ai/parse-cuisine-candidates";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import type { ContextEateryInventoryRow } from "../lib/globe/eatery/eatery-resource-types";
import { scoreEateryRecommendations } from "../lib/globe/eatery/score-eatery-recommendations";

assert.equal(parseSingleCuisineFocus("돈카츠 맛집도 찾아줘"), "돈카츠");
assert.ok(isConcreteCuisineEateryFocus("돈카츠"));
assert.ok(
  cuisineLocaleQueryHints("돈카츠").some((h) => /とんかつ|tonkatsu/i.test(h)),
);

{
  const prior = resolveLocalDiscoveryAction({
    message: "말차 맛집 찾아줘",
  });
  assert.equal(prior.status, "ready");
  if (prior.status !== "ready") throw new Error("prior ready");
  assert.match(prior.spec.eateryFocus ?? "", /말차/);

  const next = resolveLocalDiscoveryAction({
    message: "돈카츠 맛집도 찾아줘",
    previousSpec: prior.spec,
    previousTriggerMessage: "말차 맛집 찾아줘",
    followUpTurn: true,
  });
  assert.equal(next.status, "ready");
  if (next.status !== "ready") throw new Error("next ready");
  assert.match(next.spec.eateryFocus ?? "", /돈카츠/);
  assert.doesNotMatch(next.spec.eateryFocus ?? "", /말차/);

  const rel = detectIntentRelationship({
    previousText: "말차 맛집 찾아줘",
    previousSlice: {
      domain: "eatery",
      kind: parseCuisineCandidates("말차 맛집")[0]?.id ?? null,
      destinationLabel: null,
    },
    nextText: "돈카츠 맛집도 찾아줘",
  });
  assert.equal(rel.relationship, "replace");
  assert.equal(rel.clearPriorDomainKinds, true);
}

{
  const unified = {
    message: "",
    behaviorKernel: {
      state: {
        trajectory: { dominant_cluster: "none", strength: 0 },
      },
    },
    personExperienceSlice: [],
  } as unknown as UnifiedExperienceContext;

  const rows: ContextEateryInventoryRow[] = [
    {
      placeId: "tea",
      name: "nana's green tea",
      lat: 35.69,
      lng: 139.7,
      images: [],
      cuisineHint: "녹차",
      priceLevel: 2,
      rating: 4.5,
      categoryLabel: "카페",
      specialReasonKo: null,
      specialScore: 0,
      searchScore: 0,
    },
    {
      placeId: "katsu",
      name: "とんかつ まい泉",
      lat: 35.691,
      lng: 139.701,
      images: [],
      cuisineHint: "とんかつ",
      priceLevel: 2,
      rating: 4.2,
      categoryLabel: "돈카츠",
      specialReasonKo: null,
      specialScore: 0,
      searchScore: 0,
    },
  ];

  const scored = scoreEateryRecommendations({
    rows,
    unifiedContext: unified,
    lat: 35.69,
    lng: 139.7,
    focusMatch: "돈카츠",
  });

  const tea = scored.find((s) => s.row.placeId === "tea");
  const katsu = scored.find((s) => s.row.placeId === "katsu");
  assert.ok(katsu);
  assert.doesNotMatch(tea?.reasonKo ?? "", /돈카츠 검색 후보/);
  assert.match(katsu!.reasonKo, /돈카츠/);
}

console.log("✓ cuisine replace blank-slate — 말차→돈카츠 IR + focus + score copy");
