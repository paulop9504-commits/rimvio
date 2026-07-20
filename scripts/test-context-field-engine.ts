#!/usr/bin/env npx tsx
/**
 * Context Field Engine — golden compound NL → FieldPack → discovery + OS control plane.
 */
import assert from "node:assert/strict";
import {
  applyFieldsToDiscoverySpec,
  applyFieldsToGraphFilter,
  applyFieldControlToPlaceHits,
  bookingControlToToolMeta,
  compileContextFieldControl,
  composeSearchQueryWithFieldControl,
  parseContextFields,
  projectFieldControlPlane,
} from "../lib/context-field";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { resolvePalantirRefineIntent } from "../lib/globe/spatial-semantic/resolve-palantir-refine-intent";
import type { LocalDiscoveryActionSpec } from "../lib/globe/context-condition-ai/local-discovery-action-types";
import { invokeRimvioTool } from "../lib/tool-registry/invoke-rimvio-tool";
import { runPlaceSearch } from "../lib/search-engine/run-place-search";

const GOLDEN =
  "오늘 비 오니까 호텔 근처에서 웨이팅 없고 혼자 가기 좋은 2만 원 이하 현지인 고깃집 찾아.";

{
  const pack = parseContextFields(GOLDEN);
  assert.ok(pack.price?.maxKrw != null && pack.price.maxKrw <= 20_000);
  assert.equal(pack.price?.maxKrw, 20_000);
  assert.ok(pack.location?.nearHotel);
  assert.equal(pack.crowd?.value, "no_wait");
  assert.equal(pack.companion?.value, "solo");
  assert.ok(
    pack.popularity?.localFavoriteOnly || pack.popularity?.vibe === "local",
  );
  assert.ok(pack.category?.label);
  assert.match(pack.category!.label, /고기|야키니쿠/u);
  assert.equal(pack.weather?.value, "rain");
  assert.equal(pack.time?.value, "today");
  assert.equal(pack.transport?.value, "walk");

  const patch = applyFieldsToDiscoverySpec({ pack, previous: null });
  assert.equal(patch.budget, "low");
  assert.equal(patch.vibe, "local");
  assert.equal(patch.companion, "solo");
  assert.equal(patch.fieldHints?.weather, "rain");
  assert.equal(patch.fieldHints?.crowd, "no_wait");
  assert.equal(patch.fieldHints?.timeScope, "today");
  assert.ok(patch.eateryFocus);

  const graphPred = applyFieldsToGraphFilter(pack);
  assert.ok(graphPred?.localFavoriteOnly);
  assert.equal(graphPred?.sortBy, "local_desc");
}

{
  // One pack → graph + search + recommend + booking simultaneously.
  const plane = compileContextFieldControl(GOLDEN);
  assert.equal(plane.version, 1);
  assert.ok(plane.graphFilter?.localFavoriteOnly);
  assert.ok(plane.search.preferLocalFavorite);
  assert.ok(
    plane.search.querySuffixes.some((s) =>
      /고기|야키니쿠|현지|실내|혼자/u.test(s),
    ),
  );
  assert.equal(plane.eateryRankHints.companionMode, "solo");
  assert.equal(plane.eateryRankHints.foodBias, "local");
  assert.equal(plane.eateryRankHints.budgetBand, "value");
  assert.equal(plane.lodgingRankHints.companionMode, "solo");
  assert.equal(plane.booking.maxPriceKrw, 20_000);
  assert.equal(plane.booking.companion, "solo");
  assert.equal(plane.booking.preferReservable, true);
  assert.equal(plane.booking.weather, "rain");

  const q = composeSearchQueryWithFieldControl("근처 맛집", plane.search);
  assert.match(q, /실내|현지|혼자|고기|야키니쿠/u);

  const hits = runPlaceSearch({
    query: "고깃집",
    domain: "eatery",
    fieldSearch: plane.search,
    skipOsakaCatalog: true,
    limit: 4,
  });
  assert.ok(hits.length > 0);
  if (hits.some((h) => h.localFavorite)) {
    assert.equal(hits[0]?.localFavorite, true);
  }

  const ranked = applyFieldControlToPlaceHits(
    [
      {
        localFavorite: false,
        walkMinutes: 5,
        priceBand: 3,
        rating: 4.9,
        reservable: true,
      },
      {
        localFavorite: true,
        walkMinutes: 8,
        priceBand: 1,
        rating: 4.2,
        reservable: true,
      },
    ],
    plane.search,
  );
  assert.equal(ranked[0]?.localFavorite, true);

  const prep = invokeRimvioTool("booking.prepare", {
    placeName: "골목 고깃집",
    placeId: "p1",
    utterance: GOLDEN,
  });
  assert.equal(prep.meta?.maxPriceKrw, 20_000);
  assert.equal(prep.meta?.companion, "solo");
  assert.equal(prep.meta?.preferReservable, true);
  assert.equal(prep.meta?.weather, "rain");

  const meta = bookingControlToToolMeta(plane.booking);
  assert.equal(meta.crowd, "no_wait");

  const projected = projectFieldControlPlane(plane.pack);
  assert.equal(projected.booking.maxPriceKrw, plane.booking.maxPriceKrw);
}

{
  const result = resolveLocalDiscoveryAction({
    message: GOLDEN,
    mobilityConfidence: 0.9,
    budgetConfidence: 0.9,
    foodConfidence: 0.9,
    lodgingConfidence: 0.9,
  });
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    const { spec } = result;
    assert.ok(spec.resourceTypes.includes("restaurant"));
    assert.equal(spec.maxNightlyPriceKrw, 20_000);
    assert.equal(spec.budget, "low");
    assert.equal(spec.vibe, "local");
    assert.equal(spec.companion, "solo");
    assert.equal(spec.transport, "walk");
    assert.ok(spec.eateryFocus);
    assert.match(spec.eateryFocus!, /고기|야키니쿠/u);
    assert.equal(spec.fieldHints?.weather, "rain");
    assert.equal(spec.fieldHints?.crowd, "no_wait");
    assert.equal(spec.fieldHints?.timeScope, "today");
  }
}

{
  const base: LocalDiscoveryActionSpec = {
    version: 1,
    resourceTypes: ["hotel"],
    transport: "walk",
    budget: "medium",
    vibe: "popular",
    lodgingKind: "any",
    radiusM: 800,
  };
  const intent = resolvePalantirRefineIntent({
    message: "하루에 3만원대로 다시 찾아",
    currentSpec: base,
    previousRecommendations: [
      {
        kind: "lodging",
        title: "A",
        reasonKo: "",
        rank: 1,
        placeId: "p1",
        lat: 35,
        lng: 139,
      },
    ],
  });
  assert.ok(intent);
  assert.equal(intent!.kind, "spatial_patch");
}

console.log("test-context-field-engine: ok");
