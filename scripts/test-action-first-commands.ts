#!/usr/bin/env npx tsx
/**
 * Action-First command suite — non-booking NL must not Continue-scout.
 */

import assert from "node:assert/strict";
import {
  classifyIntentFamily,
  isActionFirstUtterance,
  tryRunSoftSurfaceCommand,
} from "../lib/rule-engine";
import {
  clearSessionGraphs,
  parseGraphCommands,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
  readSessionGraph,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { tryRunContextNlAction } from "../lib/action-planner";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn";
import { isLocalDiscoveryRefinement } from "../lib/globe/context-condition-ai";

const emptySsot: OperatorTurnSsot = {
  contextEventId: "evt-cmd",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: false,
  explorationMode: "convergent",
};

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

const cases: Array<{
  text: string;
  intent: string;
  op?: string;
  gate: "graph_command" | "task_injection" | "scout" | "defer_classify" | "ask_chips";
}> = [
  { text: "APA호텔 고정해", intent: "Pin", op: "pin_node", gate: "ask_chips" },
  { text: "시골집 빼줘", intent: "Delete", op: "delete_node", gate: "ask_chips" },
  {
    text: "A호텔이랑 B호텔 비교해봐",
    intent: "Compare",
    op: "compare",
    gate: "graph_command",
  },
  {
    text: "걸어서 10분 안쪽",
    intent: "Filter",
    op: "filter",
    gate: "ask_chips",
  },
  { text: "현지인 맛집만", intent: "Filter", op: "filter", gate: "ask_chips" },
  { text: "싼 것만", intent: "Filter", op: "filter", gate: "ask_chips" },
  {
    text: "APA 길 찾아줘",
    intent: "Navigate",
    gate: "graph_command",
  },
  {
    text: "캘린더에 넣어줘",
    intent: "Calendar",
    gate: "graph_command",
  },
  {
    text: "공유해줘",
    intent: "Share",
    gate: "graph_command",
  },
  {
    text: "메모해줘",
    intent: "Note",
    gate: "graph_command",
  },
  {
    text: "빨간으로 표시해",
    intent: "Highlight",
    op: "style_pin",
    gate: "graph_command",
  },
  {
    text: "주변 맛집 찾아줘",
    intent: "Search",
    op: "search_project",
    gate: "scout",
  },
  {
    text: "다이토요 예매할게",
    intent: "Reserve",
    gate: "task_injection",
  },
];

for (const row of cases) {
  assert.equal(
    classifyIntentFamily(row.text),
    row.intent,
    `intent: ${row.text}`,
  );
  if (row.op) {
    const cmds = parseGraphCommands(row.text);
    assert.equal(cmds[0]?.op, row.op, `op: ${row.text}`);
  }
  const actionFirst = isActionFirstUtterance(row.text);
  if (row.gate === "graph_command" || row.gate === "task_injection") {
    assert.equal(actionFirst, true, `actionFirst: ${row.text}`);
    assert.equal(
      isLocalDiscoveryRefinement(row.text),
      false,
      `no refine: ${row.text}`,
    );
  }
  if (row.gate === "scout" && row.op === "search_project") {
    assert.equal(actionFirst, false, `search not actionFirst: ${row.text}`);
  }
  const plan = gateOperatorTurnSync({ text: row.text, ssot: emptySsot });
  if (row.gate === "scout") {
    // Search may defer_classify or scout depending on instant cues.
    assert.ok(
      plan.tool === "scout" || plan.tool === "defer_classify",
      `gate scoutish: ${row.text} got ${plan.tool}`,
    );
  } else {
    assert.equal(plan.tool, row.gate, `gate: ${row.text}`);
  }
}

// Applied graph mutations
{
  const seeded = tryRunGraphCommandOs({
    utterance: "유성온천역 근처 동태찌개 찾아줘",
    contextEventId: "evt-cmd",
    anchorLat: 36.3621,
    anchorLng: 127.3446,
    contextLabelKo: "유성",
  });
  assert.ok(seeded);

  const pin = tryRunContextNlAction({
    utterance: "시골집생태전문 고정해",
    contextEventId: "evt-cmd",
  });
  assert.ok(pin);
  assert.equal(pin!.via, "soft_confirm");
  assert.equal(pin!.waitingCommit, false);

  const del = tryRunContextNlAction({
    utterance: "시골집생태전문 빼줘",
    contextEventId: "evt-cmd",
  });
  assert.ok(del);
  assert.equal(del!.via, "soft_confirm");
  assert.equal(del!.waitingCommit, false);

  const walk = tryRunContextNlAction({
    utterance: "걸어서 10분 안쪽",
    contextEventId: "evt-cmd",
  });
  assert.ok(walk);
  assert.equal(walk!.via, "soft_confirm");
  assert.equal(walk!.waitingCommit, false);

  const softNav = tryRunSoftSurfaceCommand({
    utterance: "길 찾아줘",
    graph: readSessionGraph("evt-cmd"),
  });
  assert.ok(softNav);
  assert.equal(softNav!.kind, "navigate");

  const softCal = tryRunSoftSurfaceCommand({
    utterance: "캘린더에 넣어줘",
    graph: readSessionGraph("evt-cmd"),
  });
  assert.ok(softCal);
  assert.equal(softCal!.kind, "calendar");

  const nlSoft = tryRunContextNlAction({
    utterance: "길 찾아줘",
    contextEventId: "evt-cmd",
  });
  assert.ok(nlSoft);
  assert.equal(nlSoft!.via, "soft_command");
}

console.log("test-action-first-commands: ok");
