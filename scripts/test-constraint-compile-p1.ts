/**
 * P1 — NL → structured ConstraintMemoryBag compile.
 * Run: npx tsx scripts/test-constraint-compile-p1.ts
 */
import assert from "node:assert/strict";
import {
  applyConstraintMemoryToScoutQuery,
  compileConstraintMemoryFromUtterance,
  emptyConstraintMemory,
  parseMinRatingFromUtterance,
} from "@/lib/agent-policy/constraint-memory";
import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";

function main() {
  // Rating must not steal 「3」from 「3개만」
  assert.equal(parseMinRatingFromUtterance("평점 높은 호텔 3개만"), 4);
  assert.equal(parseMinRatingFromUtterance("평점 4.5 이상"), 4.5);
  assert.equal(parseMinRatingFromUtterance("호텔 3개만"), null);

  const compound =
    "난바역 근처에서 10만원 이하로 평점 높은 호텔 3개만";
  const bag = compileConstraintMemoryFromUtterance({
    utterance: compound,
  });
  assert.equal(bag.nearLabelKo, "난바역");
  assert.ok(bag.maxNightlyPriceKrw != null && bag.maxNightlyPriceKrw <= 100_000);
  assert.equal(bag.minRating, 4);
  assert.equal(bag.keepTopN, 3);
  assert.equal(bag.sortBy, "rating");

  const scout = applyConstraintMemoryToScoutQuery("호텔 찾아줘", bag);
  assert.match(scout, /난바역/);
  assert.match(scout, /3개만|평점|만원/);

  // Cold compound → spatial (Discovery), not in-set filter alone
  const patch = parseWorkspacePatch(compound);
  assert.equal(patch?.kind, "spatial_constraint");
  if (patch?.kind === "spatial_constraint") {
    assert.equal(patch.nearLabelKo, "난바역");
  }

  // Soft deixis stays filter
  assert.equal(
    parseWorkspacePatch("이중에 가성비 좋은 것만 3개")?.kind,
    "filter_entity",
  );

  // Budget survives location pivot
  let mem = compileConstraintMemoryFromUtterance({
    utterance: "1박 10만원 이하",
  });
  mem = compileConstraintMemoryFromUtterance({
    prev: mem,
    utterance: "우메다 쪽으로",
  });
  assert.ok(mem.maxNightlyPriceKrw != null);
  assert.equal(mem.nearLabelKo, "우메다");

  // Empty baseline shape
  const empty = emptyConstraintMemory();
  assert.equal(empty.keepTopN, null);
  assert.equal(empty.sortBy, null);

  console.log("ok — P1 constraint compile (compound · rating · soft vs spatial)");
}

main();
