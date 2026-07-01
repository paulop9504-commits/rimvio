import assert from "node:assert/strict";
import {
  parseComposeOneTurn,
  parseConditionFromComposeText,
} from "../lib/portal/compose-draft/parse-compose-one-turn";

function main() {
  assert.equal(parseConditionFromComposeText("상태 사용감 있음"), "사용감 있음");
  assert.equal(parseConditionFromComposeText("70만원, 사용감 있음"), "사용감 있음");
  assert.equal(parseConditionFromComposeText("거의 새것"), "거의 새것");
  assert.equal(parseConditionFromComposeText("S급"), "S급");
  assert.equal(parseConditionFromComposeText("배터리 85%"), "배터리 85%");

  const combo = parseComposeOneTurn("아이폰15 70만원 상태 사용감 있음");
  assert.match(combo.draft.productName ?? "", /아이폰/i);
  assert.equal(combo.draft.priceKrw, 700_000);
  assert.equal(combo.draft.condition, "사용감 있음");

  const storage = parseComposeOneTurn("갤럭시 S24 256GB 50만원");
  assert.equal(storage.extras.storage, "256GB");
  assert.equal(storage.draft.priceKrw, 500_000);

  const typo = parseComposeOneTurn("아이폰15 70만언 사용감 있음");
  assert.equal(typo.draft.priceKrw, 700_000);
  assert.equal(typo.draft.condition, "사용감 있음");

  const pillLine = parseComposeOneTurn("70만원, 상태 사용감 있음");
  assert.equal(pillLine.draft.priceKrw, 700_000);
  assert.equal(pillLine.draft.condition, "사용감 있음");
  assert.equal(pillLine.draft.productName, undefined);

  const contextLine = parseComposeOneTurn("핸드폰 판매 70만원, 사용감 있음");
  assert.equal(contextLine.draft.productName, "핸드폰");
  assert.equal(contextLine.draft.priceKrw, 700_000);
  assert.equal(contextLine.draft.condition, "사용감 있음");

  console.log("test-parse-compose-one-turn: PASS");
}

main();
