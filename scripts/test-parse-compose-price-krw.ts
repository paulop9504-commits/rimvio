import assert from "node:assert/strict";
import {
  isPriceConfirmNo,
  isPriceConfirmYes,
  parseComposePriceKrw,
} from "../lib/portal/compose-draft/parse-compose-price-krw";

function expectOk(raw: string, krw: number) {
  const parsed = parseComposePriceKrw(raw);
  assert.equal(parsed.ok, true, `${raw} should parse`);
  if (parsed.ok) {
    assert.equal(parsed.priceKrw, krw, `${raw} → ${krw}`);
  }
}

function main() {
  expectOk("700000", 700_000);
  expectOk("700,000", 700_000);
  expectOk("70만원", 700_000);
  expectOk("70만", 700_000);
  expectOk("70만언", 700_000);
  expectOk("아이폰15 70만원 상태 좋아", 700_000);
  expectOk("80만원", 800_000);
  expectOk("백만원", 1_000_000);
  expectOk("100", 1_000_000);
  expectOk("70", 700_000);
  expectOk("1000000", 1_000_000);

  const seven = parseComposePriceKrw("7");
  assert.equal(seven.ok, true);
  if (seven.ok) {
    assert.equal(seven.priceKrw, 70_000);
  }

  assert.equal(isPriceConfirmYes("맞아요"), true);
  assert.equal(isPriceConfirmYes("네"), true);
  assert.equal(isPriceConfirmNo("아니요"), true);

  console.log("test-parse-compose-price-krw: ok");
}

main();
