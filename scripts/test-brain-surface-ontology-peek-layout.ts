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
});
assert.equal(three.nodes.length, 3);
assert.ok(three.nodes.every((node) => node.centerY > three.mediaHeight));
assert.ok(
  three.nodes[0]!.centerX < three.nodes[1]!.centerX &&
    three.nodes[1]!.centerX < three.nodes[2]!.centerX,
);

console.log("test-brain-surface-ontology-peek-layout: ok");
