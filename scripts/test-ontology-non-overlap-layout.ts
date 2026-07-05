#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  layoutScreenAnchoredNodeOffsets,
  resolveNonOverlappingCalloutOffsets,
} from "../lib/globe/resolve-non-overlapping-callout-offsets";
import { computeMindMapLayout } from "../lib/situation-projection/compute-mind-map-layout";
import type { SituationProjectionManifest } from "../lib/situation-projection/types";

const offsets = resolveNonOverlappingCalloutOffsets(6);
assert.equal(offsets.length, 6);
assert.ok(new Set(offsets.map((row) => `${row.x},${row.y}`)).size === 6);
for (let i = 0; i < offsets.length; i += 1) {
  for (let j = i + 1; j < offsets.length; j += 1) {
    const dx = Math.abs(offsets[i]!.x - offsets[j]!.x);
    const dy = Math.abs(offsets[i]!.y - offsets[j]!.y);
    assert.ok(
      dx >= 120 || dy >= 64,
      `offsets ${i}/${j} should not overlap (${dx}, ${dy})`,
    );
  }
}

const screen = layoutScreenAnchoredNodeOffsets([
  { id: "a", x: 180, y: 320, width: 160, height: 72, priority: 90 },
  { id: "b", x: 182, y: 318, width: 160, height: 72, priority: 80 },
  { id: "c", x: 179, y: 322, width: 160, height: 72, priority: 70 },
]);
assert.notEqual(screen.a?.dy, screen.b?.dy, "stacked screen cards should separate vertically");

const manifest: SituationProjectionManifest = {
  eventId: "evt-layout",
  situationType: "travel",
  surfaceKind: "mind_map",
  layoutSource: "deterministic",
  nodes: [
    {
      kind: "solid",
      id: "solid:root",
      label: "도쿄 여행",
      virtual: false,
    },
    {
      kind: "ghost",
      id: "ghost:lodging:1",
      axisId: "lodging",
      label: "신주쿠 숙소",
      virtual: true,
      inferred: true,
      emphasis: "main",
    },
    {
      kind: "ghost",
      id: "ghost:eatery:1",
      axisId: "eatery",
      label: "라멘",
      virtual: true,
      inferred: true,
      emphasis: "main",
    },
    {
      kind: "ghost",
      id: "ghost:eatery:2",
      axisId: "eatery",
      label: "이자카야",
      virtual: true,
      inferred: true,
      emphasis: "aux",
    },
  ],
  links: [],
  pills: [],
};

const layout = computeMindMapLayout(manifest);
const lodging = layout.nodes.find((node) => node.id === "ghost:lodging:1");
const eateryA = layout.nodes.find((node) => node.id === "ghost:eatery:1");
const eateryB = layout.nodes.find((node) => node.id === "ghost:eatery:2");
assert.ok(lodging && eateryA && eateryB);
assert.ok(
  lodging.y < eateryA.y && lodging.y < eateryB.y,
  "lodging row should sit above eatery row",
);
assert.ok(
  Math.abs(eateryA.y - eateryB.y) <= 1 || eateryA.x !== eateryB.x,
  "sibling eatery ghosts should not stack on the same slot",
);

console.log("test-ontology-non-overlap-layout: ok");
