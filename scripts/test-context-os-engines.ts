#!/usr/bin/env npx tsx
/**
 * Context OS engines vertical — Intent→Graph→Search→Reason→Commit gate.
 */

import assert from "node:assert/strict";
import {
  applyGraphCommands,
  clearSessionGraphs,
  parseGraphCommands,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  resolveGraphEntity,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { runPlaceSearch } from "../lib/search-engine";
import { assertHumanRealityCommit } from "../lib/reality-commit";
import { moveNodeToProjectContext, tryRunMoveContextCommand } from "../lib/context-engine";
import { runBookingPrepareAgent } from "../lib/agent-runtime";
import { tryRunContextNlAction } from "../lib/action-planner";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

// 1 Intent — extended IR
{
  assert.equal(parseGraphCommands("APA호텔 삭제해")[0]?.op, "delete_node");
  assert.equal(
    parseGraphCommands("이 핀은 빨간색으로")[0]?.op,
    "style_pin",
  );
  assert.equal(parseGraphCommands("항상 보여")[0]?.op, "set_visibility");
  assert.equal(parseGraphCommands("시뮬레이션 해줘")[0]?.op, "simulate");
}

// 5 Search Engine
{
  const hits = runPlaceSearch({
    query: "APA 호텔",
    domain: "lodging",
    anchorLat: 34.67,
    anchorLng: 135.5,
  });
  assert.ok(hits.some((h) => /APA/i.test(h.labelKo)));
}

// seed graph via search_project
tryRunGraphCommandOs({
  utterance: "APA 호텔 찾아줘",
  contextEventId: "evt-engines",
  anchorLat: 34.67,
  anchorLng: 135.5,
});

// 2 Entity Resolver weighted
{
  const g = readSessionGraph("evt-engines");
  assert.ok(g && g.nodes.length >= 2);
  applyGraphCommands({
    contextEventId: "evt-engines",
    commands: [
      { op: "pin_node", targetRef: { labelKo: g!.nodes[0]!.labelKo } },
    ],
  });
  const hit = resolveGraphEntity({
    labelKo: "APA",
    graph: readSessionGraph("evt-engines"),
    viewerLat: 34.67,
    viewerLng: 135.5,
  });
  assert.ok(hit.nodeId || hit.ref.nodeId);
  assert.ok(hit.score > 0);
}

// 1+3 delete / style / note / group
{
  const label = readSessionGraph("evt-engines")!.nodes.find((n) => n.pinned)
    ?.labelKo;
  assert.ok(label);
  applyGraphCommands({
    contextEventId: "evt-engines",
    commands: [{ op: "style_pin", targetRef: { labelKo: label! }, accent: "red" }],
  });
  assert.equal(
    readSessionGraph("evt-engines")!.nodes.find((n) => n.labelKo === label)
      ?.accent,
    "red",
  );
}

// 6 Reasoning only
{
  const g = readSessionGraph("evt-engines")!;
  const a = g.nodes[0]!;
  const b = g.nodes[1]!;
  applyGraphCommands({
    contextEventId: "evt-engines",
    commands: [
      {
        op: "compare",
        leftRef: { labelKo: a.labelKo },
        rightRef: { labelKo: b.labelKo },
      },
    ],
  });
  const reason = parseGraphCommands("어느 게 더 나아?", readSessionGraph("evt-engines"));
  assert.equal(reason[0]?.op, "reason_pick");
  const applied = applyGraphCommands({
    contextEventId: "evt-engines",
    commands: reason,
  });
  assert.ok(applied.ok);
}

// 4 Context Engine move
{
  const node = readSessionGraph("evt-engines")!.nodes.find(
    (n) => n.kind === "lodging" || n.kind === "poi",
  )!;
  moveNodeToProjectContext({
    fromContextEventId: "evt-engines",
    toContextEventId: "evt-japan-trip",
    labelKo: node.labelKo,
    folderLabelKo: "호텔",
    anchorLat: 34.67,
    anchorLng: 135.5,
  });
  const dest = readSessionGraph("evt-japan-trip");
  assert.ok(dest?.nodes.some((n) => n.labelKo === node.labelKo));
  assert.ok(dest?.projectFolders.includes("호텔"));
}

// 8 Simulation
{
  const sim = tryRunGraphCommandOs({
    utterance: "비 오면 시뮬레이션",
    contextEventId: "evt-engines",
  });
  assert.ok(sim);
  assert.ok(
    readSessionGraph("evt-engines")!.nodes.some((n) => n.kind === "simulation"),
  );
}

// 7 Agent prepare
{
  const agent = runBookingPrepareAgent({
    contextEventId: "evt-engines",
    placeId: "place-1",
    placeName: "APA 난바",
    kind: "lodging",
  });
  assert.equal(agent.ok, true);
}

// 9 Reality Commit gate
{
  const blocked = assertHumanRealityCommit({
    contextEventId: "evt-engines",
    operationIds: ["op:1"],
    approvedByHuman: false,
  });
  assert.equal(blocked.allowed, false);
  const ok = assertHumanRealityCommit({
    contextEventId: "evt-engines",
    operationIds: ["op:1"],
    approvedByHuman: true,
  });
  assert.equal(ok.allowed, true);
}

// + Action Planner
{
  clearSessionGraphs();
  clearPreparedRealityOperations();
  const nl = tryRunContextNlAction({
    utterance: "A호텔이랑 B호텔 비교해서 예약해",
    contextEventId: "evt-plan-card",
    anchorLat: 35.6,
    anchorLng: 139.7,
  });
  assert.equal(nl?.via, "action_plan");
}

// + Context Engine move via NL pipeline
{
  clearSessionGraphs();
  tryRunGraphCommandOs({
    utterance: "APA호텔 고정",
    contextEventId: "evt-move",
    anchorLat: 34.67,
    anchorLng: 135.5,
  });
  const viaEngine = tryRunMoveContextCommand({
    utterance: "APA 난바를 여행 맥락으로 옮겨",
    contextEventId: "evt-move",
    anchorLat: 34.67,
    anchorLng: 135.5,
  });
  assert.ok(viaEngine);
  assert.ok(viaEngine!.assistantReplyKo.includes("맥락으로"));

  const viaNl = runNaturalLanguagePipeline({
    utterance: "APA 우메다를 오사카 맥락으로 옮겨",
    contextEventId: "evt-move",
    anchorLat: 34.67,
    anchorLng: 135.5,
  });
  assert.equal(viaNl.result?.via, "graph_command");
}

console.log("test-context-os-engines: ok");
