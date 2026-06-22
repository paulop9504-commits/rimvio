#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  getTrendBridgeFeature,
  listTrendBridgeHudFeatures,
  resolveTrendBridgeFeature,
  resolveTrendBridgeFromMentionInput,
  suggestTrendBridgeFeatures,
} from "../lib/globe/trend-bridge/trend-bridge-feature-registry";
import {
  loadTrendBridgeSettings,
  patchTrendBridgeSettings,
} from "../lib/globe/trend-bridge/trend-bridge-settings";
import { projectTrendBridgeStubZones } from "../lib/globe/trend-bridge/project-trend-bridge-stub-zones";

function main() {
  const hud = listTrendBridgeHudFeatures();
  assert.ok(hud.length >= 5);
  assert.ok(hud.every((row) => row.hudVisible !== false));
  assert.equal(hud.find((row) => row.bridgeId === "food.delivery"), undefined);

  const food = resolveTrendBridgeFeature("맛집");
  assert.ok(food);
  assert.equal(food!.bridgeId, "food");

  const korean = resolveTrendBridgeFromMentionInput("@한식");
  assert.ok(korean);
  assert.equal(korean!.bridgeId, "food.korean");

  const bike = resolveTrendBridgeFeature("중고자전거");
  assert.ok(bike);
  assert.equal(bike!.parentBridgeId, "market.used");

  const suggestions = suggestTrendBridgeFeatures("카");
  assert.ok(suggestions.some((row) => row.bridgeId === "food.cafe"));

  const feature = getTrendBridgeFeature("food.cafe");
  assert.ok(feature);
  assert.equal(feature!.displayName, "카페");

  const zones = projectTrendBridgeStubZones({
    bridgeId: "food",
    anchorLat: 35.538,
    anchorLng: 128.418,
  });
  assert.equal(zones.length, 3);
  assert.equal(zones[0]!.bridgeId, "food");
  assert.ok(zones[0]!.intensity > zones[2]!.intensity);

  const before = loadTrendBridgeSettings();
  const patched = patchTrendBridgeSettings({
    enabled: true,
    activeBridgeId: "market.used_bike",
  });
  assert.equal(patched.enabled, true);
  assert.equal(patched.activeBridgeId, "market.used_bike");
  patchTrendBridgeSettings(before);

  console.log("test-trend-bridge-registry: ok");
}

main();
