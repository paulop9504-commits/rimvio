#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  detectNaturalMarketComposeInput,
  isBareMarketComposeInput,
  isMarketComposeInput,
  isMentionMarketComposeInput,
  readMarketComposeQuery,
} from "../lib/globe/market/detect-market-compose-input";
import { resolveGlobeMapIntent } from "../lib/globe/intent-supply/resolve-globe-map-intent";
import { runGlobeComposerAction } from "../lib/globe/run-globe-composer-action";

assert.equal(isMentionMarketComposeInput("@중고"), true);
assert.equal(isBareMarketComposeInput("@중고"), true);
assert.equal(isBareMarketComposeInput("@중고 "), true);
assert.equal(isBareMarketComposeInput("@중고 아이폰 15"), false);
assert.equal(readMarketComposeQuery("@중고 아이폰 15"), "아이폰 15");

assert.equal(detectNaturalMarketComposeInput("아이폰 팔고 싶어"), true);
assert.equal(isMarketComposeInput("아이폰 15 프로 70만원"), true);
assert.equal(readMarketComposeQuery("아이폰 15 프로 70만원"), "아이폰 15 프로");
assert.equal(detectNaturalMarketComposeInput("수원 카페"), false);
assert.equal(detectNaturalMarketComposeInput("강남 숙소 찾아줘"), false);
assert.equal(resolveGlobeMapIntent("강남 숙소 찾아줘").kind, "lodging_supply");
assert.equal(resolveGlobeMapIntent("아이폰 팔고 싶어").kind, "market_compose");

const naturalMarket = runGlobeComposerAction("맥북 에어 사고 싶어");
assert.ok(naturalMarket);
assert.equal(naturalMarket!.kind, "market-compose");

assert.equal(isMarketComposeInput("수원 카페"), false);
console.log("test-market-compose-detect: ok");
