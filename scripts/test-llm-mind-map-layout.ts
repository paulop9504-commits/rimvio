#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetEntityGraphStoreForTests } from "../lib/ontology";
import {
  applyLlmMindMapLayout,
  computeMindMapLayout,
  composeBrainProjectionManifest,
  parseLlmMindMapLayoutWire,
  resetProjectionStoreForTests,
  resolveMindMapLayout,
  shouldRequestLlmMindMapLayout,
  validateLlmMindMapLayoutWire,
} from "../lib/situation-projection";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();
resetProjectionStoreForTests();

const event = commitEventUpsert({
  id: "ev-layout-test",
  title: "어머니 진단 상담",
  category: "custom",
  source: "message",
  lifecycle: "completed",
  place: "○○병원",
  metadata: { peerDisplayName: "어머니" },
});

const manifest = composeBrainProjectionManifest({
  event,
  trigger: { source: "manual", atIso: new Date().toISOString() },
  persist: false,
});

assert.ok(manifest.mindMapLayout, "deterministic mindMapLayout attached");
assert.equal(manifest.layoutSource, "deterministic");
assert.equal(manifest.mindMapLayout!.nodes.length, manifest.nodes.length);

const deterministic = computeMindMapLayout(manifest);
assert.equal(resolveMindMapLayout(manifest).width, deterministic.width);

const nodeIds = manifest.nodes.map((node) => node.id);
const validWire = {
  positions: nodeIds.map((id, index) => ({
    id,
    x: 20 + (index % 3) * 25,
    y: 12 + Math.floor(index / 3) * 28,
  })),
  pillOrder: [...manifest.pills].reverse().map((pill) => pill.id),
  surfaceKind: "mind_map" as const,
};

const parsed = parseLlmMindMapLayoutWire(JSON.stringify({
  positions: validWire.positions,
  pill_order: validWire.pillOrder,
  surface_kind: validWire.surfaceKind,
}));
assert.ok(parsed, "valid wire parses");
assert.deepEqual(validateLlmMindMapLayoutWire(parsed!, manifest), []);

const llmApplied = applyLlmMindMapLayout(manifest, parsed);
assert.equal(llmApplied.layoutSource, "llm");
assert.ok(llmApplied.mindMapLayout);
assert.notDeepEqual(
  llmApplied.mindMapLayout!.nodes[0],
  manifest.mindMapLayout!.nodes[0],
  "LLM shifts first node position",
);
assert.equal(
  llmApplied.pills[0]?.id,
  manifest.pills[manifest.pills.length - 1]?.id,
  "pill order reversed",
);

const invalidParse = parseLlmMindMapLayoutWire(
  JSON.stringify({ positions: [{ id: "ghost:missing", x: 50, y: 50 }] }),
);
assert.ok(invalidParse);
assert.ok(
  validateLlmMindMapLayoutWire(invalidParse!, manifest).some((f) =>
    f.startsWith("unknown_position:"),
  ),
);

const partialWire = parseLlmMindMapLayoutWire(
  JSON.stringify({
    positions: [{ id: nodeIds[0], x: 50, y: 10 }],
  }),
);
assert.ok(partialWire);
assert.ok(
  validateLlmMindMapLayoutWire(partialWire!, manifest).includes("position_count_mismatch"),
);

const fallback = applyLlmMindMapLayout(manifest, partialWire);
assert.equal(fallback.layoutSource, "deterministic");
assert.deepEqual(fallback.mindMapLayout, manifest.mindMapLayout);

const noop = applyLlmMindMapLayout(manifest, null);
assert.equal(noop.layoutSource, "deterministic");
assert.deepEqual(noop.mindMapLayout, manifest.mindMapLayout);

assert.equal(
  shouldRequestLlmMindMapLayout({ ...manifest, nodes: [manifest.nodes[0]!] }),
  false,
  "single-node manifest skips LLM gate",
);

console.log("test-llm-mind-map-layout: ok");
