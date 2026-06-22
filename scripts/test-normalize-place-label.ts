#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { normalizePlaceLabel } from "../lib/globe/normalize-place-label";

function main() {
  assert.equal(normalizePlaceLabel("대전 겔러리아"), "대전 갤러리아");
  assert.equal(normalizePlaceLabel("  대전   겔러리아  "), "대전 갤러리아");
  assert.equal(normalizePlaceLabel("갤러리아타임월드"), "갤러리아 타임월드");
  assert.equal(normalizePlaceLabel("에버랜드리조트"), "에버랜드");
  console.log("test-normalize-place-label: ok");
}

main();
