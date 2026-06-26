import assert from "node:assert/strict";

import {
  detectMarketProhibitedListing,
  isMarketListingAllowed,
} from "../lib/globe/market/guard-market-prohibited-listing";

assert.equal(detectMarketProhibitedListing("아이폰 15 프로"), null);
assert.equal(detectMarketProhibitedListing("맥북 에어 M2"), null);
assert.equal(detectMarketProhibitedListing("주방칼 세트"), null);

assert.equal(detectMarketProhibitedListing("맥주 24캔"), "alcohol");
assert.equal(detectMarketProhibitedListing("위스키 18년"), "alcohol");
assert.equal(detectMarketProhibitedListing("soju bottle"), "alcohol");

assert.equal(detectMarketProhibitedListing("담배 1갑"), "tobacco");
assert.equal(detectMarketProhibitedListing("아이코스 일루마"), "tobacco");
assert.equal(detectMarketProhibitedListing("전자담배 액상"), "tobacco");

assert.equal(detectMarketProhibitedListing("에어소프트 총"), "weapons");
assert.equal(detectMarketProhibitedListing("성인용품"), "adult");

assert.equal(
  isMarketListingAllowed({
    title: "갤럭시 S24",
    detail: { productName: "갤럭시 S24", sourceText: "" } as never,
  }),
  true,
);
assert.equal(
  isMarketListingAllowed({
    title: "소주",
    detail: { productName: "소주", sourceText: "" } as never,
  }),
  false,
);

console.log("test-market-prohibited-listing: ok");
