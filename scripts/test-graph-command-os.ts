#!/usr/bin/env npx tsx
/**
 * Graph Command OS — parse + apply; search_project → pins; filter; reserve_prep no Commit.
 */

import assert from "node:assert/strict";
import {
  applyGraphCommands,
  clearSessionGraphs,
  parseGraphCommands,
  planContextRun,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
  clearContextWorkspace,
} from "../lib/context-workspace";
import { planContextRun as planRun } from "../lib/context-run/plan-context-run";
import type { BoundSituation } from "../lib/context-run/ingress-types";
import {
  buildRealityControlSnapshot,
  clearPreparedRealityOperations,
} from "../lib/reality-queue";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

{
  const cmds = parseGraphCommands("유성온천역 근처 동태찌개 찾아줘");
  assert.equal(cmds.length, 1);
  assert.equal(cmds[0]?.op, "search_project");
  assert.equal(cmds[0] && "domain" in cmds[0] && cmds[0].domain, "eatery");
}

{
  const cmds = parseGraphCommands("걸어서 10분 안쪽");
  assert.equal(cmds[0]?.op, "filter");
  assert.equal(
    cmds[0] && "predicate" in cmds[0] && cmds[0].predicate.maxWalkMinutes,
    10,
  );
}

{
  const cmds = parseGraphCommands("A호텔이랑 B호텔 비교해");
  assert.equal(cmds[0]?.op, "compare");
}

{
  const cmds = parseGraphCommands("임성보 글로브에 고정해");
  assert.equal(cmds[0]?.op, "pin_node");
}

{
  const applied = tryRunGraphCommandOs({
    utterance: "유성온천역 근처 동태찌개 찾아줘",
    contextEventId: "evt-yuseong",
    anchorLat: 36.3621,
    anchorLng: 127.3446,
    contextLabelKo: "유성온천",
  });
  assert.ok(applied);
  // Map search → Context Workspace (not Globe graph stamp).
  assert.equal(hasProvisionalContextWorkspace("evt-yuseong"), true);
  const ws = readContextWorkspace("evt-yuseong");
  assert.ok((ws?.nodes.length ?? 0) >= 1);
  assert.equal(ws?.domain, "eatery");
  assert.equal(
    applied!.graph.nodes.filter((n) => n.kind === "eatery").length,
    0,
  );
  assert.ok(
    applied!.assistantReplyKo.includes("후보") ||
      applied!.assistantReplyKo.includes("작업장"),
  );
  clearContextWorkspace("evt-yuseong");
}

{
  const compare = applyGraphCommands({
    contextEventId: "evt-cmp",
    commands: parseGraphCommands("리버뷰 호텔이랑 스테이 인 비교해"),
    anchorLat: 35.67,
    anchorLng: 139.7,
  });
  assert.ok(compare.ok);
  if (compare.ok) {
    assert.ok(compare.graph.compareClusterId);
    assert.ok(compare.graph.nodes.some((n) => n.kind === "compare"));
  }
}

{
  const bound: BoundSituation = {
    graphId: "graph-test",
    goalKo: "맛집 찾아줘",
    ingress: {
      kind: "text",
      text: "근처 맛집 찾아줘",
      surface: "composer",
      layerMode: "personal",
      contextEventId: "evt-plan",
      lat: 36.36,
      lng: 127.34,
    },
  };
  const plan = planRun(bound);
  assert.equal(plan.kind, "graph_command");
  assert.ok(plan.graphCommands?.length);
}

{
  const cmds = parseGraphCommands("임성보 글로브에 고정해");
  assert.equal(cmds[0]?.op, "pin_node");
}

{
  const cmds = parseGraphCommands("시골집 빼줘");
  assert.equal(cmds[0]?.op, "delete_node");
}

{
  const cmds = parseGraphCommands("A호텔이랑 B호텔 비교해봐");
  assert.equal(cmds[0]?.op, "compare");
}

{
  const cmds = parseGraphCommands("싼 것만");
  assert.equal(cmds[0]?.op, "filter");
}

{
  const cmds = parseGraphCommands("예약 가능한 곳만 남겨");
  assert.equal(cmds[0]?.op, "filter");
}

// Context chat: map search → Workspace Preview (no Globe graph stamp until Commit).
{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  const eatery = tryRunGraphCommandOs({
    utterance: "둔산동 맛집 찾아",
    contextEventId: "evt-dunsan-eatery",
    anchorLat: 36.35,
    anchorLng: 127.38,
    contextLabelKo: "대전 서구 둔산동",
  });
  assert.ok(eatery);
  assert.match(eatery!.assistantReplyKo, /후보 \d+곳 준비했어요/);
  assert.equal(hasProvisionalContextWorkspace("evt-dunsan-eatery"), true);
  const eateryWs = readContextWorkspace("evt-dunsan-eatery");
  assert.equal(eateryWs?.domain, "eatery");
  assert.ok((eateryWs?.nodes.length ?? 0) >= 3);
  assert.equal(
    eatery!.graph.nodes.filter((n) => n.kind === "eatery").length,
    0,
  );
  clearContextWorkspace("evt-dunsan-eatery");

  const pharmacy = tryRunGraphCommandOs({
    utterance: "약국찾아",
    contextEventId: "evt-dunsan-pharm",
    anchorLat: 36.35,
    anchorLng: 127.38,
    contextLabelKo: "대전 서구 둔산동",
  });
  assert.ok(pharmacy);
  assert.match(pharmacy!.assistantReplyKo, /후보 \d+곳 준비했어요/);
  assert.equal(hasProvisionalContextWorkspace("evt-dunsan-pharm"), true);
  const pharmWs = readContextWorkspace("evt-dunsan-pharm");
  assert.ok((pharmWs?.nodes.length ?? 0) >= 1);
  assert.ok(
    pharmWs!.nodes.every(
      (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng) && n.lat !== 0,
    ),
  );
  clearContextWorkspace("evt-dunsan-pharm");
}

console.log("test-graph-command-os: ok");
