/**
 * Unit Canon SSOT smoke.
 * Run: npx tsx scripts/test-unit-canon.ts
 */

import assert from "node:assert/strict";
import {
  UNIT_CANON_VERSION,
  LODGING_DISPLAY_MONEY_BASIS,
  LODGING_COMMIT_MONEY_BASIS,
  WALK_METERS_PER_MINUTE,
  walkMinutesFromMeters,
  assertDecisionWeightsSumToOne,
  measuredLodgingDisplayMoney,
  measuredLodgingCommitMoney,
  resolveLodgingNightlyKrw,
} from "@/lib/unit-canon";

function main() {
  assert.equal(UNIT_CANON_VERSION, "unit-canon.v1");
  assert.equal(LODGING_DISPLAY_MONEY_BASIS, "nightly");
  assert.equal(LODGING_COMMIT_MONEY_BASIS, "total");
  assert.equal(WALK_METERS_PER_MINUTE, 80);
  assert.equal(walkMinutesFromMeters(160), 2);
  assert.equal(
    assertDecisionWeightsSumToOne({
      location: 0.4,
      scheduleFit: 0.4,
      price: 0.2,
    }),
    true,
  );
  assert.equal(
    resolveLodgingNightlyKrw({
      priceKrw: 300_000,
      totalPriceKrw: 300_000,
      nights: 3,
    }),
    100_000,
  );
  assert.equal(measuredLodgingDisplayMoney(100_000, 3).basis, "nightly");
  assert.equal(measuredLodgingCommitMoney(300_000, 3).basis, "total");
  console.log("ok — unit canon");
}

main();
