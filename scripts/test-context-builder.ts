#!/usr/bin/env npx tsx
/**
 * Context Builder — packs relevant nodes only (Cursor-style), never full graph.
 */

import assert from "node:assert/strict";
import {
  buildContextPack,
  clearLastContextPack,
  formatContextPackHintKo,
  readLastContextPack,
  resolveDeicticFromLastPack,
  writeLastContextPack,
} from "../lib/context-builder";
import {
  clearSessionGraphs,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();
clearLastContextPack();

tryRunGraphCommandOs({
  utterance: "APA호텔 고정",
  contextEventId: "evt-ctx-builder",
  anchorLat: 34.6654,
  anchorLng: 135.5019,
});
tryRunGraphCommandOs({
  utterance: "주변 맛집 찾아줘",
  contextEventId: "evt-ctx-builder",
});

const graph = readSessionGraph("evt-ctx-builder");
assert.ok(graph);
assert.ok(graph!.nodes.length >= 4);

const pack = buildContextPack({
  utterance: "첫 번째 예약",
  graph,
  intent: "Reserve",
  maxNodes: 8,
});

assert.equal(pack.version, 1);
assert.ok(pack.stats.graphNodeTotal >= pack.stats.packedNodeCount);
assert.ok(pack.nodes.length <= 8);
assert.ok(pack.nodes.length >= 1);
assert.ok(pack.nodes.every((n) => n.whyIncludedKo.length > 0));
// Must not equal dumping everything if graph is larger than cap with low scores —
// at minimum truncated flag is honest when graph > packed
if (graph!.nodes.length > pack.nodes.length) {
  assert.equal(pack.stats.truncated, true);
}

writeLastContextPack(pack);
assert.equal(readLastContextPack("evt-ctx-builder")?.nodes.length, pack.nodes.length);

const deictic = resolveDeicticFromLastPack("evt-ctx-builder", "여기 예약해");
assert.ok(deictic);
assert.ok(deictic!.labelKo.length > 0);

const hint = formatContextPackHintKo(pack);
assert.ok(hint.includes("맥락") || hint.includes("비어"));

console.log("ok — context-builder");
