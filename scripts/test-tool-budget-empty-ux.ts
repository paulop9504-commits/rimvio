#!/usr/bin/env npx tsx
/**
 * STEP4 — tool budget timeout + empty soft-retry + booking.prepare prepare-only.
 */

import assert from "node:assert/strict";
import {
  formatLookupCountSummaryKo,
  formatLookupEmptySummaryKo,
  withToolBudget,
} from "../lib/tool-registry/with-tool-budget";
import { invokeRimvioTool } from "../lib/tool-registry/invoke-rimvio-tool";
import { SPINE_PREPARE_ONLY_TOOL_IDS } from "../lib/context-run/cursor-os-spine";

async function main(): Promise<void> {
  {
    let calls = 0;
    const result = await withToolBudget({
      timeoutMs: 80,
      softRetry: true,
      run: async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 200));
        return ["late"];
      },
      isEmpty: (rows) => rows.length === 0,
    });
    assert.equal(result.timedOut, true);
    assert.equal(result.retried, true);
    assert.equal(result.value, null);
    assert.equal(calls, 2);
  }

  {
    let calls = 0;
    const result = await withToolBudget({
      timeoutMs: 500,
      softRetry: true,
      run: async () => {
        calls += 1;
        if (calls === 1) {
          return [] as string[];
        }
        return ["ok"];
      },
      isEmpty: (rows) => rows.length === 0,
    });
    assert.equal(result.retried, true);
    assert.deepEqual(result.value, ["ok"]);
    assert.equal(calls, 2);
  }

  assert.equal(
    formatLookupCountSummaryKo("숙소", 0),
    formatLookupEmptySummaryKo("숙소"),
  );
  assert.match(formatLookupEmptySummaryKo("맛집"), /다시 찾아볼까요/);
  assert.match(formatLookupCountSummaryKo("숙소", 3), /3곳/);

  {
    const prep = invokeRimvioTool("booking.prepare", {
      placeName: "Nine Hours",
      placeId: "liteapi:nh-1",
    });
    assert.equal(prep.toolId, "booking.prepare");
    assert.equal(prep.meta?.prepareOnly, true);
    assert.ok(prep.summaryKo.includes("예약 준비"));
    assert.ok(!/commit|결제 완료|예약 확정/iu.test(prep.summaryKo));
    assert.deepEqual([...SPINE_PREPARE_ONLY_TOOL_IDS], ["booking.prepare"]);
  }

  console.log("test-tool-budget-empty-ux: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
