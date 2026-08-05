/**
 * Timeline Patch E2E — Select #2 → Day 2 → Timeline (realityDraft) → Map visible.
 *
 * Run: npx tsx scripts/test-timeline-patch-e2e.ts
 */

import assert from "node:assert/strict";
import {
  applyWorkspacePatch,
  parseWorkspacePatch,
} from "@/lib/context-workspace/workspace-patch";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { runAutoProjectionAfterPatch } from "@/lib/context-workspace/auto-projection";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { publishGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { writeContextWorkspaceExpanded } from "@/lib/context-workspace/workspace-store";
import { resolveAgentActionLevel } from "@/lib/agent-policy/action-level-gate";

const CTX = "ctx_timeline_patch_e2e";

clearContextWorkspace(CTX);
publishGlobeProjectionLayerPolicy({
  layer: "workspace",
  contextEventId: CTX,
});

openMapContextWorkspace({
  contextEventId: CTX,
  domain: "eatery",
  query: "난바역 근처 맛집",
  summaryKo: "난바역 근처 맛집",
  candidates: [
    {
      id: "eatery:a",
      labelKo: "맛집 A",
      lat: 34.6654,
      lng: 135.5019,
      kind: "eatery",
      rating: 4.6,
      distanceMeters: 350,
    },
    {
      id: "eatery:b",
      labelKo: "맛집 B",
      lat: 34.666,
      lng: 135.5025,
      kind: "eatery",
      rating: 4.4,
      distanceMeters: 520,
    },
    {
      id: "eatery:c",
      labelKo: "맛집 C",
      lat: 34.667,
      lng: 135.503,
      kind: "eatery",
      rating: 4.3,
      distanceMeters: 680,
    },
  ],
  source: "scout_patch",
});
writeContextWorkspaceExpanded(CTX, true);

const before = readContextWorkspace(CTX)!;
assert.ok(before.nodes.filter((n) => n.visible && n.kind === "eatery").length >= 3);

// Parse compound: ordinal + Day 2
const utt = "이 중 2번을 Day 2에 넣어줘";
const patch = parseWorkspacePatch(utt);
assert.equal(patch?.kind, "move_schedule");
if (patch?.kind === "move_schedule") {
  assert.equal(patch.dayIndex, 1, "Day 2 → dayIndex 1");
  assert.equal(patch.ordinalIndex, 1, "2번 → ordinal 1");
}

// DISCOVER ≠ MODIFY — assigning to day is not prepare/commit
const level = resolveAgentActionLevel(utt);
assert.notEqual(level.level, "prepare");
assert.notEqual(level.level, "commit");

const applied = applyWorkspacePatch({
  contextEventId: CTX,
  patch: patch!,
  utterance: utt,
});
assert.equal(applied.ok, true);
assert.match(applied.statusKo, /Day2|Day 2|일정/);

const after = readContextWorkspace(CTX)!;
const places = after.nodes.filter(
  (n) => n.visible && n.kind === "eatery",
);
assert.ok(places.length >= 3);
const second = places[1]!;
assert.ok(second.visible, "Map: entity stays visible");
assert.ok(
  second.tags.some((t) => /^day[_-]?2$/iu.test(t)),
  "Timeline: day_2 tag stamped",
);
assert.ok(after.selectedIds.includes(second.id));
assert.match(second.title, /맛집 B|B/);

const day2 = after.realityDraft?.days.find((d) => d.day === 2);
assert.ok(day2, "realityDraft Day 2 exists");
assert.ok(
  day2!.nodes.some((n) => n.nodeId === second.id),
  "Timeline draft includes selected entity",
);

assert.ok(
  after.relationshipEdges?.some(
    (e) =>
      e.fromId === second.id &&
      (e.labelKo?.includes("Day2") || e.toId === "schedule:day2"),
  ),
  "schedule edge",
);

const projected = runAutoProjectionAfterPatch({
  contextEventId: CTX,
  patchRecord: applied.record,
  entityIds: [second.id],
});
assert.equal(projected.ok, true);
assert.equal(projected.manualRefreshRequired, false);

void (async () => {
  // Agent loop path (same utterance, fresh select order)
  clearContextWorkspace(CTX);
  openMapContextWorkspace({
    contextEventId: CTX,
    domain: "eatery",
    query: "난바역 근처 맛집",
    summaryKo: "난바역 근처 맛집",
    candidates: [
      {
        id: "eatery:a2",
        labelKo: "맛집 A",
        lat: 34.6654,
        lng: 135.5019,
        kind: "eatery",
      },
      {
        id: "eatery:b2",
        labelKo: "맛집 B",
        lat: 34.666,
        lng: 135.5025,
        kind: "eatery",
      },
      {
        id: "eatery:c2",
        labelKo: "맛집 C",
        lat: 34.667,
        lng: 135.503,
        kind: "eatery",
      },
    ],
    source: "scout_patch",
  });
  writeContextWorkspaceExpanded(CTX, true);

  const agent = await applyGlobeWorkspaceAgentTurn({
    utterance: "2번 Day 2에 넣어줘",
    explicitContextEventId: CTX,
  });
  assert.equal(agent.handled, true);
  assert.equal(agent.patchKind, "move_schedule");

  const viaAgent = readContextWorkspace(CTX)!;
  const movedPlaces = viaAgent.nodes.filter(
    (n) => n.visible && n.kind === "eatery",
  );
  const movedB = movedPlaces[1];
  assert.ok(movedB);
  assert.ok(movedB!.tags.some((t) => /^day[_-]?2$/iu.test(t)));
  assert.ok(
    viaAgent.realityDraft?.days.some(
      (d) => d.day === 2 && d.nodes.some((n) => n.nodeId === movedB!.id),
    ),
  );

  clearContextWorkspace(CTX);
  console.log("OK — timeline-patch-e2e (ordinal → Day2 → draft → projection)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
