#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  hashTrendBridgeActor,
  resolveTrendBridgeLocationDong,
  haversineKm,
} from "../lib/globe/trend-bridge/server/trend-bridge-geo";
import { projectTrendBridgeRollupZones } from "../lib/globe/trend-bridge/project-trend-bridge-rollup-zones";

function main() {
  const a = hashTrendBridgeActor("user-a");
  const b = hashTrendBridgeActor("user-b");
  assert.notEqual(a, b);
  assert.equal(a, hashTrendBridgeActor("user-a"));

  const dong = resolveTrendBridgeLocationDong("서울 송파구 가락동");
  assert.equal(dong, "가락동");

  const tongyeong = resolveTrendBridgeLocationDong("통영");
  assert.ok(tongyeong);

  const km = haversineKm(37.5665, 126.978, 37.5765, 126.988);
  assert.ok(km > 0 && km < 2);

  const zones = projectTrendBridgeRollupZones({
    bridgeId: "food.cafe",
    rollups: [
      {
        id: "r1",
        bridge_id: "food.cafe",
        location_dong: "성수동",
        category_label: "카페",
        day_segment: "weekend",
        peak_hour_label: "15:00 - 16:00",
        peak_bucket_start: 15,
        trend_velocity: "high",
        context_summary: "주말 오후 카페 기록이 급증하고 있음",
        hotspot_lat: 37.544,
        hotspot_lng: 127.055,
        contributor_count: 8,
        record_count: 12,
        computed_at: new Date().toISOString(),
      },
    ],
  });
  assert.equal(zones.length, 1);
  assert.equal(zones[0]!.intensity, 0.9);
  assert.equal(zones[0]!.label, "성수동");

  console.log("test-trend-bridge-geo: ok");
}

main();
