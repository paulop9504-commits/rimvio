#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { parseMarketProductFromText } from "../lib/globe/market/parse-market-product-from-text";
import { marketWizardSteps } from "../lib/globe/market/market-intent-wizard-flow";

function main() {
  const bare = parseMarketProductFromText("@중고");
  assert.equal(bare.productName, "");

  const seeking = parseMarketProductFromText("@중고 아이폰 15 프로 삽니다 80만 이하");
  assert.equal(seeking.productName, "아이폰 15 프로");

  const listing = parseMarketProductFromText("맥북 프로 14 팝니다 120만원");
  assert.equal(listing.productName, "맥북 프로 14");

  const withPlace = parseMarketProductFromText("@중고 아이폰 15 프로 80만 대전 팝니다");
  assert.equal(withPlace.productName, "아이폰 15 프로");

  const seekingSteps = marketWizardSteps("seeking");
  assert.deepEqual(seekingSteps, ["role", "recognize", "place", "review"]);

  const listingSteps = marketWizardSteps("listing");
  assert.ok(!listingSteps.includes("priority"));
  assert.ok(listingSteps.includes("photos"));

  console.log("test-parse-market-product: ok");
}

main();
