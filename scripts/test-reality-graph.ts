#!/usr/bin/env npx tsx
/**
 * Reality Graph / World Engine — Entity ID hierarchy, not bare "Tokyo" strings.
 */

import assert from "node:assert/strict";
import {
  answerAdminDivisionQuestion,
  formatWorldGeoHierarchyEn,
  formatWorldGeoHierarchyKo,
  resolveWorldGeoEntity,
  resolveWorldGeoNearCoords,
  worldEngineLookup,
  buildRealitySyncSlice,
  REALITY_SYNC_INTERVAL_MS,
  projectWorldGeoToPlaceFields,
} from "../lib/reality-graph";
import { resolveSpatialTargetFromText } from "../lib/globe/spatial/resolve-spatial-target-from-text";

// Tokyo → Metropolis entity (not string dump)
{
  const hit = resolveWorldGeoEntity("도쿄 무슨 현이야?");
  assert.ok(hit);
  assert.equal(hit.node.id, "geo:jp:tokyo");
  assert.equal(hit.node.kind, "metropolis");
  assert.ok(hit.ancestors.some((n) => n.id === "geo:jp"));

  const answer = answerAdminDivisionQuestion("도쿄 무슨 현이야?");
  assert.ok(answer);
  assert.match(answer.answerKo, /도쿄도|都|도\(/u);
  assert.equal(answer.adminNode.id, "geo:jp:tokyo");
}

// Shinjuku chain
{
  const hit = resolveWorldGeoEntity("신주쿠");
  assert.ok(hit);
  assert.equal(hit.node.id, "geo:jp:tokyo:shinjuku");
  const path = formatWorldGeoHierarchyEn(hit);
  assert.match(path, /Japan/u);
  assert.match(path, /Tokyo/u);
  assert.match(path, /Shinjuku/u);
  assert.equal(
    formatWorldGeoHierarchyKo(hit),
    "일본 → 도쿄도 → 신주쿠구",
  );
}

// Specificity — Kabukicho over Shinjuku when both present
{
  const hit = resolveWorldGeoEntity("신주쿠 가부키초");
  assert.ok(hit);
  assert.equal(hit.node.id, "geo:jp:tokyo:shinjuku:kabukicho");
}

// GPS centroid near Shinjuku
{
  const near = resolveWorldGeoNearCoords(35.6938, 139.7034);
  assert.ok(near);
  assert.equal(near.node.id, "geo:jp:tokyo:shinjuku");
}

// World Engine + Reality Sync
{
  const lookup = worldEngineLookup("오사카");
  assert.ok(lookup);
  assert.equal(lookup.hit.node.id, "geo:jp:osaka");
  assert.ok(lookup.sync);
  assert.equal(lookup.sync!.refreshIntervalMs, REALITY_SYNC_INTERVAL_MS);
  assert.equal(lookup.sync!.layers.timezone, "ok");
  assert.equal(lookup.sync!.layers.currency, "ok");
  assert.equal(lookup.sync!.layers.weather, "pending");

  const sync = buildRealitySyncSlice({
    geoId: "geo:jp:tokyo",
    weatherSummaryKo: "맑음 22°",
    gpsActive: true,
  });
  assert.ok(sync);
  assert.equal(sync!.layers.weather, "ok");
  assert.equal(sync!.layers.gps, "ok");
}

// Spatial target wire
{
  const spatial = resolveSpatialTargetFromText("시부야 근처");
  assert.ok(spatial);
  assert.equal(spatial!.source, "reality_graph");
  assert.equal(spatial!.zoneId, "geo:jp:tokyo:shibuya");

  const fields = projectWorldGeoToPlaceFields("긴자");
  assert.ok(fields);
  assert.equal(fields!.zoneId, "geo:jp:tokyo:ginza");
  assert.equal(fields!.countryCode, "JP");
  assert.equal(fields!.timezone, "Asia/Tokyo");
}

// China / Korea seed
{
  const shanghai = resolveWorldGeoEntity("상하이");
  assert.ok(shanghai);
  assert.equal(shanghai!.node.id, "geo:cn:shanghai");
  const pudong = projectWorldGeoToPlaceFields("푸동");
  assert.ok(pudong);
  assert.equal(pudong!.zoneId, "geo:cn:shanghai:pudong");
  assert.equal(pudong!.countryCode, "CN");
}

console.log("✓ reality graph (tokyo · shinjuku · sync · spatial · shanghai)");
