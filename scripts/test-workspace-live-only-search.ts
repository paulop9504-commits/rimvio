/**
 * Workspace live-only search — never invent Riverview orbit seeds on async path.
 * Run: npx tsx scripts/test-workspace-live-only-search.ts
 */

import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOsAsync,
} from "@/lib/graph-command";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace";
import { runPlaceSearchAsync } from "@/lib/search-engine";
import { clearPreparedRealityOperations } from "@/lib/reality-queue";

async function main() {
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();

  // Without live keys / network — async must return [] (not Riverview orbit).
  const hits = await runPlaceSearchAsync({
    query: "서울 숙소",
    domain: "lodging",
    anchorLat: 37.5665,
    anchorLng: 126.978,
    limit: 4,
  });
  assert.equal(
    hits.some((h) => /리버뷰|스테이 인|시티 로지/.test(h.labelKo)),
    false,
    "async must not invent Riverview orbit seeds",
  );
  assert.ok(
    hits.every((h) => !h.id.startsWith("search:")),
    "no search: orbit ids",
  );
  console.log(`✓ async lodging → ${hits.length} live/empty (no orbit seed)`);

  const EVENT = "test-ws-live-only";
  clearContextWorkspace(EVENT);
  const applied = await tryRunGraphCommandOsAsync({
    utterance: "근처 호텔 찾아줘",
    contextEventId: EVENT,
    anchorLat: 37.5665,
    anchorLng: 126.978,
    contextLabelKo: "서울",
  });
  assert.ok(applied);
  const ws = readContextWorkspace(EVENT);
  const names = (ws?.nodes ?? []).map((n) => n.labelKo);
  assert.equal(
    names.some((n) => /리버뷰|스테이 인|시티 로지/.test(n)),
    false,
    `workspace must not show demo hotels, got: ${names.join(", ")}`,
  );
  console.log(
    `✓ workspace lodging search → ${names.length} nodes (no demo triad)`,
  );

  clearContextWorkspace(EVENT);
  console.log("\nAll workspace live-only tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
