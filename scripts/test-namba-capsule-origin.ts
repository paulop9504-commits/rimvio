#!/usr/bin/env npx tsx
/**
 * 「난바역 근처 캡슐」 must origin at Namba (not Osaka trip center),
 * keyword includes area, and 「싹 찾아」 goes diffuse / wider.
 */
import assert from "node:assert/strict";
import { resolveEntities, findStationEntity } from "../lib/entity-resolver";
import { resolveDiscoveryOriginFromUtterance } from "../lib/globe/context-condition-ai/resolve-discovery-origin-from-utterance";
import { resolveLodgingSearchKeyword } from "../lib/globe/context-condition-ai/filter-lodging-for-intent";
import { parseUtteranceIntentSlots } from "../lib/globe/context-condition-ai/utterance-intent-slots";
import { resolveLodgingMockForPlace } from "../lib/globe/context-hub/lodging-mock-inventory";
import { lodgingRowMatchesStayType } from "../lib/globe/lodging/lodging-stay-types";
import {
  applyExplorationMode,
  resolveExplorationMode,
} from "../lib/globe/discovery-policy";
import { evaluateScoutQualityGate } from "../lib/globe/discovery-quality";
import { resolveWorldGeoEntity } from "../lib/reality-graph/resolve-world-geo";

const NAMBA = { lat: 34.6654, lng: 135.5019 };
const MSG_NEAR = "난바역 근처에 캡슐호텔 찾아줘";
const MSG_SWEEP = "주변 캡슐호텔 싹 찾아줘";

{
  const hit = resolveWorldGeoEntity("난바역");
  assert.ok(hit, "world geo must resolve 난바역");
  assert.equal(hit!.node.id, "geo:jp:osaka:namba-station");
  assert.ok(Math.abs(hit!.node.centroid.lat - NAMBA.lat) < 0.001);
}

{
  const resolved = resolveEntities(MSG_NEAR);
  const station = findStationEntity(resolved.entities);
  assert.ok(station, "entity resolver must lock Station for 난바역");
  assert.ok(station!.geoId === "geo:jp:osaka:namba-station" || station!.lat != null);
  assert.match(station!.label, /난바/);
}

{
  const origin = resolveDiscoveryOriginFromUtterance(MSG_NEAR, {
    lat: 34.6937,
    lng: 135.5023,
    regionLabel: "오사카",
    radiusM: 2500,
    lensId: null,
  });
  assert.ok(origin);
  assert.match(origin!.regionLabel, /난바/);
  assert.ok(Math.abs(origin!.lat - NAMBA.lat) < 0.01);
  assert.ok(origin!.radiusM >= 2500);
}

{
  const slots = parseUtteranceIntentSlots(MSG_NEAR);
  assert.ok(slots.stationHint && /난바/.test(slots.stationHint));
  const keyword = resolveLodgingSearchKeyword({
    lodgingKind: "any",
    lodgingStayType: "capsule",
    message: MSG_NEAR,
    areaHint: slots.stationHint ?? slots.areaHint,
  });
  assert.ok(keyword);
  assert.match(keyword!, /캡슐/);
  assert.match(keyword!, /난바/);
}

{
  assert.equal(resolveExplorationMode({ message: MSG_SWEEP }), "diffuse");
  const diffuse = applyExplorationMode("diffuse");
  assert.ok(diffuse.lodgingMaxResults >= 36);
  assert.ok(diffuse.lodgingRadiusBoostM >= 2500);
  assert.ok(diffuse.feedInventoryCap >= 36);
}

{
  const mock = resolveLodgingMockForPlace("오사카", NAMBA);
  const capsules = mock.filter((row) => lodgingRowMatchesStayType(row, "capsule"));
  assert.ok(
    capsules.length >= 4,
    `expected ≥4 Osaka capsule mocks, got ${capsules.length}`,
  );
}

{
  assert.equal(
    evaluateScoutQualityGate({
      recommendationCount: 2,
      lodgingCount: 2,
      eateryCount: 0,
      activityCount: 0,
      amenityCount: 0,
      attemptsUsed: 2,
    }).verdict,
    "sufficient",
    "lodging-only 2 hits must not exhaust as thin",
  );
}

console.log("test-namba-capsule-origin: ok");
