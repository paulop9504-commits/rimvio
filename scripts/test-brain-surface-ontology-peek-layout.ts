#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { layoutBrainSurfaceOntologyPeek } from "../lib/globe/layout-brain-surface-ontology-peek";

const empty = layoutBrainSurfaceOntologyPeek({ satellites: [] });
assert.equal(empty.nodes.length, 0);
assert.ok(empty.rootStem.x === empty.width / 2);

const three = layoutBrainSurfaceOntologyPeek({
  satellites: [
    { id: "a" } as never,
    { id: "b" } as never,
    { id: "c" } as never,
  ],
  width: 300,
});
assert.equal(three.nodes.length, 3);
assert.ok(three.nodes.every((node) => node.centerY > three.mediaHeight));
const external = layoutBrainSurfaceOntologyPeek({
  satellites: [{ id: "a" } as never],
  width: 300,
  mediaExternal: true,
});
assert.equal(external.mediaHeight, 0);
assert.equal(external.rootStem.y, 0);
assert.ok(external.nodes[0]!.centerY > 0);
const spread = Math.hypot(
  three.nodes[2]!.centerX - three.nodes[0]!.centerX,
  three.nodes[2]!.centerY - three.nodes[0]!.centerY,
);
assert.ok(spread > 40);

console.log("test-brain-surface-ontology-peek-layout: ok");
