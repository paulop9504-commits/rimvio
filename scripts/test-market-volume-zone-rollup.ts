#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveMarketVolumeZone } from "../lib/globe/market/price-guide/resolve-market-volume-zone";
import {
  buildMarketVolumeZoneRollup,
  filterRealizedPricesForVolumeZone,
} from "../lib/globe/market/price-guide/rollup-realized-volume-zone";

function main() {
  const rows = [
    {
      realizedPriceKrw: 880_000,
      productName: "아이폰 15 프로",
      batteryPercent: 82,
      categoryId: "market.phone",
    },
    {
      realizedPriceKrw: 920_000,
      productName: "아이폰 15 프로",
      batteryPercent: 85,
      categoryId: "market.phone",
    },
    {
      realizedPriceKrw: 900_000,
      productName: "iPhone 15 Pro",
      batteryPercent: 80,
      categoryId: "market.phone",
    },
    {
      realizedPriceKrw: 700_000,
      productName: "아이폰 15",
      batteryPercent: 80,
      categoryId: "market.phone",
    },
  ];

  const filtered = filterRealizedPricesForVolumeZone({
    rows,
    productName: "아이폰 15 프로",
    batteryPercent: 80,
    categoryId: "market.phone",
  });
  assert.equal(filtered.length, 3);

  const rollup = buildMarketVolumeZoneRollup(filtered);
  assert.ok(rollup);
  assert.equal(rollup.sampleCount, 3);
  assert.equal(rollup.anchorMan, 90);
  assert.equal(rollup.bandMinMan, 88);
  assert.equal(rollup.bandMaxMan, 92);

  const seedOnly = resolveMarketVolumeZone({
    productName: "아이폰 15 프로",
    categoryId: "market.phone",
    batteryPercent: 80,
    role: "seeking",
  });
  assert.equal(seedOnly.confidence, "seed");
  assert.equal(seedOnly.sampleCount, 0);

  const withRealized = resolveMarketVolumeZone({
    productName: "아이폰 15 프로",
    categoryId: "market.phone",
    batteryPercent: 80,
    role: "listing",
    userPriceKrw: 900_000,
    rollup,
  });
  assert.equal(withRealized.confidence, "realized");
  assert.equal(withRealized.sampleCount, 3);
  assert.equal(withRealized.pricePosition, "in_zone");

  assert.equal(buildMarketVolumeZoneRollup([900_000]), null);

  console.log("test-market-volume-zone-rollup: ok");
}

main();
