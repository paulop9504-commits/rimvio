#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { formatMarketVolumeZoneCopy } from "../lib/globe/market/price-guide/format-market-volume-zone-copy";
import { resolveMarketBatteryTier } from "../lib/globe/market/price-guide/market-battery-tier";
import { resolveMarketVolumeZone } from "../lib/globe/market/price-guide/resolve-market-volume-zone";

function main() {
  assert.deepEqual(resolveMarketBatteryTier(90)?.id, "A");
  assert.deepEqual(resolveMarketBatteryTier(85)?.id, "B");
  assert.deepEqual(resolveMarketBatteryTier(79)?.id, "C");
  assert.equal(resolveMarketBatteryTier(0), null);

  const iphone15Pro80 = resolveMarketVolumeZone({
    productName: "아이폰 15 프로",
    categoryId: "market.phone",
    batteryPercent: 80,
    cosmeticGrade: "good",
    role: "seeking",
  });
  assert.equal(iphone15Pro80.available, true);
  assert.equal(iphone15Pro80.bandMinMan, 85);
  assert.equal(iphone15Pro80.bandMaxMan, 95);
  assert.equal(iphone15Pro80.anchorMan, 90);

  const inZone = resolveMarketVolumeZone({
    productName: "아이폰 15 프로",
    categoryId: "market.phone",
    batteryPercent: 80,
    role: "listing",
    userPriceKrw: 900_000,
  });
  assert.equal(inZone.pricePosition, "in_zone");

  const below = resolveMarketVolumeZone({
    productName: "아이폰 15 프로",
    categoryId: "market.phone",
    batteryPercent: 80,
    role: "listing",
    userPriceKrw: 700_000,
  });
  assert.equal(below.pricePosition, "below");

  const seekingCopy = formatMarketVolumeZoneCopy(iphone15Pro80, "seeking");
  assert.ok(seekingCopy?.body.includes("85~95"));
  assert.ok(seekingCopy?.tierLine.includes("80%"));

  const nonPhone = resolveMarketVolumeZone({
    productName: "나이키 후드",
    categoryId: "market.fashion",
    batteryPercent: 80,
    role: "seeking",
  });
  assert.equal(nonPhone.available, false);

  console.log("test-market-volume-zone: ok");
}

main();
