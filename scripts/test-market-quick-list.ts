#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildMarketQuickListDraft,
  canQuickListMarketCompose,
} from "../lib/globe/market/build-market-quick-list-draft";
import { parseMarketPlaceFromText } from "../lib/globe/market/parse-market-place-from-text";

assert.equal(parseMarketPlaceFromText("@중고 아이폰 80만 대전"), "대전");
assert.equal(canQuickListMarketCompose("@중고"), false);
assert.equal(canQuickListMarketCompose("@중고 아이폰 15 프로 80만 대전 팝니다"), true);

const draft = buildMarketQuickListDraft({
  text: "@중고 아이폰 15 프로 80만 대전 팝니다",
  eventId: "ev-quick",
});
assert.ok(draft);
assert.equal(draft!.detail.productName, "아이폰 15 프로");
assert.equal(draft!.priceMaxKrw, 800_000);
assert.equal(draft!.placeLabel, "대전");
assert.equal(draft!.role, "listing");
assert.ok(draft!.prefillSources.includes("quick_list"));

console.log("test-market-quick-list: ok");
