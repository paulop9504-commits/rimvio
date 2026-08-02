/**
 * Smoke: Globe Reality Interface — Earth→Region→Context→Entity, read-only.
 */
import assert from "node:assert/strict";
import {
  REALITY_DESKTOP_LEVELS,
  REALITY_NODE_KINDS,
  buildKoreaRealityDesktopSeed,
  buildRealityDesktopPath,
  createContextProjectionNode,
  createEntityProjectionNode,
  createRegionNode,
} from "@/lib/globe/reality-interface";

assert.deepEqual([...REALITY_DESKTOP_LEVELS], [
  "earth",
  "region",
  "location",
  "context",
  "entity",
]);
assert.deepEqual([...REALITY_NODE_KINDS], ["region", "context", "entity"]);

const path = buildRealityDesktopPath({
  earth: "Earth",
  region: "대한민국",
  location: "서울",
  contextTitle: "오사카 여행",
});
assert.deepEqual([...path.labels], ["Earth", "대한민국", "서울", "오사카 여행"]);

const region = createRegionNode({
  id: "r1",
  titleKo: "대한민국",
  pathLabels: ["Earth", "대한민국"],
});
assert.equal(region.kind, "region");
assert.equal(region.readOnly, true);

const ctx = createContextProjectionNode({
  id: "c1",
  contextId: "ws-osaka",
  titleKo: "오사카 4박5일",
  pathLabels: ["Earth", "대한민국", "서울", "오사카 4박5일"],
});
assert.equal(ctx.kind, "context");
assert.equal(ctx.level, "context");
assert.equal(ctx.readOnly, true);
assert.equal(ctx.contextId, "ws-osaka");

const ent = createEntityProjectionNode({
  id: "e1",
  entityId: "ent_hotel",
  titleKo: "난바 호텔",
  contextId: "ws-osaka",
});
assert.equal(ent.kind, "entity");
assert.equal(ent.readOnly, true);

const seed = buildKoreaRealityDesktopSeed({
  location: "서울",
  contexts: [
    {
      contextId: "ws-osaka",
      titleKo: "오사카 쇼핑 여행",
      subtitleKo: "Context Node",
      entities: [
        {
          entityId: "ent_cap",
          titleKo: "캡슐호텔",
          subtitleKo: "Entity",
        },
      ],
    },
  ],
});

assert.equal(seed.viewOnly, true);
assert.equal(seed.mayEdit, false);
assert.ok(seed.regionNodes.some((n) => n.titleKo === "대한민국"));
assert.ok(seed.regionNodes.some((n) => n.titleKo === "서울"));
assert.ok(seed.regionNodes.some((n) => n.titleKo === "대전"));
assert.equal(seed.contextNodes.length, 1);
assert.equal(seed.contextNodes[0]!.contextId, "ws-osaka");
assert.equal(seed.entityNodes.length, 1);
assert.equal(seed.entityNodes[0]!.entityId, "ent_cap");
assert.ok(seed.path.labels[0] === "Earth");

// Constitution: every node is read-only projection
for (const n of [
  ...seed.regionNodes,
  ...seed.contextNodes,
  ...seed.entityNodes,
]) {
  assert.equal(n.readOnly, true);
}

console.log(
  "ok globe-reality-interface Earth→Region→Context→Entity read-only-projection",
);
