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
  projectSessionGraphToBrainCandidates,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
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
  assert.ok(applied!.graph.nodes.length >= 3);
  const markers = projectSessionGraphToBrainCandidates(applied!.graph);
  assert.ok(markers.length >= 3);
  assert.ok(markers.every((m) => m.markerStyle === "dashed" || m.markerStyle === "solid"));

  const filtered = tryRunGraphCommandOs({
    utterance: "걸어서 10분 안쪽",
    contextEventId: "evt-yuseong",
  });
  assert.ok(filtered);
  assert.ok(
    filtered!.graph.nodes
      .filter((n) => n.visible && n.kind === "eatery")
      .every((n) => (n.walkMinutes ?? 99) <= 10),
  );

  const pin = tryRunGraphCommandOs({
    utterance: "시골집생태전문 고정해",
    contextEventId: "evt-yuseong",
  });
  assert.ok(pin);
  assert.ok(pin!.graph.nodes.some((n) => n.labelKo.includes("시골집") && n.pinned));

  const prep = tryRunGraphCommandOs({
    utterance: "예약 준비해",
    contextEventId: "evt-yuseong",
  });
  assert.ok(prep);
  assert.ok(prep!.reservedOpIds.length >= 1);

  const snap = buildRealityControlSnapshot({
    events: [],
    tradeSessions: [],
    applyHolds: false,
  });
  assert.equal(snap.canCommit, false, "graph command must not auto-Commit");
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

console.log("test-graph-command-os: ok");
