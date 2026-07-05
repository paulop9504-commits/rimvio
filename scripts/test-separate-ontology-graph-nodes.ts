#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { separateOntologyGraphNodes } from "../lib/globe/separate-ontology-graph-nodes";
import { nudgeMapAnchorDragOffsets } from "../lib/globe/nudge-map-anchor-drag-offsets";
import { layoutBrainSurfaceOntologyPeek } from "../lib/globe/layout-brain-surface-ontology-peek";

const stacked = separateOntologyGraphNodes({
  nodes: [
    { id: "a", centerX: 150, centerY: 40, width: 62, height: 58 },
    { id: "b", centerX: 152, centerY: 42, width: 62, height: 58 },
    { id: "c", centerX: 148, centerY: 39, width: 62, height: 58 },
  ],
  width: 300,
});
assert.ok(
  Math.abs(stacked.nodes[0]!.centerX - stacked.nodes[1]!.centerX) > 20 ||
    Math.abs(stacked.nodes[0]!.centerY - stacked.nodes[1]!.centerY) > 20,
  "stacked nodes should separate",
);

const peek = layoutBrainSurfaceOntologyPeek({
  satellites: [
    { id: "a" } as never,
    { id: "b" } as never,
    { id: "c" } as never,
    { id: "d" } as never,
    { id: "e" } as never,
  ],
  width: 300,
  mediaExternal: true,
});
assert.equal(peek.nodes.length, 5);
for (let i = 0; i < peek.nodes.length; i += 1) {
  for (let j = i + 1; j < peek.nodes.length; j += 1) {
    const a = peek.nodes[i]!;
    const b = peek.nodes[j]!;
    const dx = Math.abs(a.centerX - b.centerX);
    const dy = Math.abs(a.centerY - b.centerY);
    assert.ok(
      dx >= 58 || dy >= 52,
      `peek nodes ${i}/${j} should not overlap (${dx}, ${dy})`,
    );
  }
}

const mapNudged = nudgeMapAnchorDragOffsets([
  {
    id: "a",
    anchorX: 180,
    anchorY: 320,
    autoDx: 0,
    autoDy: 0,
    userDx: 0,
    userDy: 0,
    width: 140,
    height: 72,
  },
  {
    id: "b",
    anchorX: 182,
    anchorY: 318,
    autoDx: 0,
    autoDy: 0,
    userDx: 0,
    userDy: 0,
    width: 140,
    height: 72,
  },
]);
assert.notDeepEqual(mapNudged.a, mapNudged.b, "map anchor nudge should spread siblings");

console.log("test-separate-ontology-graph-nodes: ok");
