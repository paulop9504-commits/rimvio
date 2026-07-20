#!/usr/bin/env npx tsx
/**
 * Reality Explorer — Cursor File Tree analog (Project → Ontology ↔ Globe).
 */

import assert from "node:assert/strict";
import {
  buildRealityExplorer,
  compileProjectTree,
  listGlobeProjectableNodes,
} from "../lib/reality-explorer";

{
  const tree = compileProjectTree({
    utterance: "오사카 여행 가고 싶어",
    projectId: "proj:test:osaka",
  });
  assert.equal(tree.kind, "project");
  assert.match(tree.labelKo, /Osaka|오사카/i);
  const sectors = tree.children.map((c) => c.sector);
  assert.ok(sectors.includes("flight"));
  assert.ok(sectors.includes("hotel"));
  assert.ok(sectors.includes("food"));
  assert.ok(sectors.includes("transit"));
  assert.ok(sectors.includes("tasks"));

  const flight = tree.children.find((c) => c.sector === "flight")?.children[0];
  const hotel = tree.children.find((c) => c.sector === "hotel")?.children[0];
  assert.ok(flight);
  assert.equal(flight!.relationKind, "arrives_before");
  assert.equal(flight!.relatedNodeId, hotel!.id);
}

{
  const explorer = buildRealityExplorer({
    utterance: "오사카 여행 가고 싶어",
    projectId: "proj:test:osaka2",
  });
  assert.equal(explorer.version, 1);
  assert.equal(explorer.preparePlan.introKo, "I'll prepare:");
  assert.ok(explorer.preparePlan.steps.some((s) => s.labelKo.includes("호텔")));
  assert.equal(explorer.preparePlan.projectingKo, "Projection 중…");

  assert.equal(explorer.branches.length, 4);
  assert.ok(explorer.branches.some((b) => b.root === "globe"));
  assert.ok(explorer.branches.some((b) => b.root === "ontology"));
  assert.ok(explorer.branches.some((b) => b.root === "execution"));
  assert.ok(explorer.branches.some((b) => b.root === "timeline"));

  const globeIds = new Set(
    listGlobeProjectableNodes(explorer.dual.globeRoot).map((n) => n.id),
  );
  const ontologyEntities =
    explorer.dual.ontologyRoot.children.find((c) => c.labelKo === "Entities")
      ?.children ?? [];
  for (const entity of ontologyEntities) {
    assert.ok(
      globeIds.has(entity.id) ||
        listGlobeProjectableNodes(explorer.tree).some((n) => n.id === entity.id),
      `entity ${entity.id} should share id with project tree`,
    );
  }

  assert.ok(explorer.dual.relations.some((r) => r.kind === "arrives_before"));
  assert.ok(
    explorer.branches
      .find((b) => b.root === "execution")
      ?.children.some((c) => c.kind === "inbox"),
  );
}

{
  const explorer = buildRealityExplorer({
    utterance: "상하이 여행",
    projectId: "proj:test:queue",
    executionItems: [
      {
        operationId: "op:test:flight",
        itemId: "op:test:flight",
        type: "booking_prep",
        domain: "travel",
        status: "ready",
        contextEventId: "evt-test",
        contextLabelKo: "상하이 여행",
        labelKo: "상하이 항공권 비교",
        createdBy: "ai_assistant",
        preview: {
          titleKo: "상하이 항공권 비교",
          summaryKo: "출발·귀국 후보 3개 준비",
        },
        needApproval: true,
        dependsOnItemIds: [],
        dependencyNoteKo: null,
        undoAllowed: true,
        expiresAtIso: null,
        kind: "flight",
      },
    ],
  });
  const inbox = explorer.branches
    .find((b) => b.root === "execution")
    ?.children.find((c) => c.kind === "inbox");
  assert.ok(inbox);
  assert.equal(inbox!.children[0]?.kind, "operation");
  assert.equal(inbox!.children[0]?.labelKo, "상하이 항공권 비교");
  assert.equal(inbox!.children[0]?.sector, "flight");
}

{
  const eat = buildRealityExplorer({
    utterance: "유성 국밥",
    projectId: "proj:test:eat",
  });
  assert.ok(eat.tree.children.some((c) => c.sector === "food"));
  assert.ok(eat.preparePlan.steps.some((s) => s.labelKo.includes("맛집")));
}

console.log("test-reality-explorer: ok");
