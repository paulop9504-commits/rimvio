import assert from "node:assert/strict";
import {
  isBareMarketComposeInput,
  isMarketComposeInput,
  readMarketComposeQuery,
} from "@/lib/globe/market/detect-market-compose-input";

function run() {
  assert.equal(isMarketComposeInput("@중고"), true);
  assert.equal(isBareMarketComposeInput("@중고"), true);
  assert.equal(isBareMarketComposeInput("@중고 "), true);
  assert.equal(isBareMarketComposeInput("@중고 아이폰 15"), false);
  assert.equal(readMarketComposeQuery("@중고 아이폰 15"), "아이폰 15");
  assert.equal(isMarketComposeInput("수원 카페"), false);
  console.log("test-market-compose-detect: ok");
}

run();
