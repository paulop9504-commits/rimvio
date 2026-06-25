#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { inferMarketListingFromFilename } from "../lib/globe/market/infer-market-listing-from-media";
import { parseStorageGb } from "../lib/globe/market/parse-storage-gb";
import {
  MARKET_STORAGE_MATCH_THRESHOLDS,
  scoreMarketStorageAlignment,
} from "../lib/globe/market/score-market-storage-alignment";

function main() {
  assert.equal(parseStorageGb("256GB"), 256);
  assert.equal(parseStorageGb("512 기가"), 512);
  assert.equal(parseStorageGb(128), 128);

  assert.equal(
    scoreMarketStorageAlignment({ seekingGb: 256, listingGb: 256 }),
    MARKET_STORAGE_MATCH_THRESHOLDS.exactOrUpgrade,
  );
  assert.equal(
    scoreMarketStorageAlignment({ seekingGb: 256, listingGb: 512 }),
    MARKET_STORAGE_MATCH_THRESHOLDS.exactOrUpgrade,
  );
  assert.equal(
    scoreMarketStorageAlignment({ seekingGb: 256, listingGb: 128 }),
    MARKET_STORAGE_MATCH_THRESHOLDS.oneTierBelow,
  );
  assert.equal(
    scoreMarketStorageAlignment({ seekingGb: 512, listingGb: 128 }),
    MARKET_STORAGE_MATCH_THRESHOLDS.twoTiersBelow,
  );
  assert.equal(
    scoreMarketStorageAlignment({ seekingGb: 1024, listingGb: 64 }),
    MARKET_STORAGE_MATCH_THRESHOLDS.hardMiss,
  );
  assert.equal(
    scoreMarketStorageAlignment({ seekingGb: null, listingGb: 256 }),
    MARKET_STORAGE_MATCH_THRESHOLDS.missingNeutral,
  );

  const fromName = inferMarketListingFromFilename("iPhone_15_Pro_256GB.jpg");
  assert.ok(fromName);
  assert.equal(fromName!.productName.toLowerCase().includes("iphone"), true);
  assert.equal(fromName!.storageGb, 256);
  assert.equal(fromName!.source, "filename");

  console.log("test-market-storage-alignment: ok");
}

main();
