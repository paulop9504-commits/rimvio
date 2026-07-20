#!/usr/bin/env npx tsx
/**
 * NL strengthen — selection/ordinal SSOT · Analyze reason_pick ·
 * search_payment / filter_navigate · Reserve/Share/Delete synonyms ·
 * compare_filter / move_share · negation · Revise relatives · Create slots.
 */

import assert from "node:assert/strict";
import {
  buildActionPlan,
  isCompoundActionUtterance,
  tryRunContextNlAction,
} from "../lib/action-planner";
import {
  clearSessionGraphs,
  ensureSessionGraph,
  parseGraphCommands,
  parseOrdinalIndex,
  resolveSelectionOrOrdinalRef,
  resetGraphCommandStoreForTests,
  writeSessionGraph,
  type SessionGraphV1,
  readSessionGraph,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { classifyIntentFamily } from "../lib/rule-engine";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import { normalizeNlNegation } from "../lib/context-run/normalize-nl-negation";
import { isCreateContextUtterance } from "../lib/context-run/try-run-nl-context-create";
import { buildPendingContextCreateDraft } from "../lib/globe-ingress/build-pending-context-create-draft";
import { compileGlobeIngress } from "../lib/globe-ingress/compile-globe-ingress";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

function seedGraph(id: string): SessionGraphV1 {
  let graph = ensureSessionGraph({ contextEventId: id });
  graph = {
    ...graph,
    nodes: [
      {
        id: "a",
        labelKo: "A호텔",
        kind: "lodging",
        lat: 34.66,
        lng: 135.5,
        rating: 4.2,
        walkMinutes: 5,
        reservable: true,
        localFavorite: false,
        priceBand: 2,
        pinned: false,
        visible: true,
        alwaysVisible: false,
        parentId: null,
        groupId: null,
        accent: "default",
        projectFolderKo: null,
        attrs: {},
      },
      {
        id: "b",
        labelKo: "B호텔",
        kind: "lodging",
        lat: 34.67,
        lng: 135.51,
        rating: 4.5,
        walkMinutes: 8,
        reservable: true,
        localFavorite: true,
        priceBand: 3,
        pinned: false,
        visible: true,
        alwaysVisible: false,
        parentId: null,
        groupId: null,
        accent: "default",
        projectFolderKo: null,
        attrs: {},
      },
    ],
    selectionIds: ["b"],
  };
  writeSessionGraph(graph);
  return graph;
}

// 1 — selection / ordinal SSOT
{
  assert.equal(parseOrdinalIndex("두 번째 예약"), 1);
  assert.equal(parseOrdinalIndex("세번째"), 2);
  const g = seedGraph("evt-sel");
  const second = resolveSelectionOrOrdinalRef(g, "두 번째 예약해");
  assert.equal(second?.labelKo, "A호텔"); // selection-biased order: B then A → index 1 = A
  // Actually listVisiblePlaceNodes puts selection first: [B, A], index 1 = A. Good.
  const deictic = resolveSelectionOrOrdinalRef(g, "그거 예약해");
  assert.equal(deictic?.labelKo, "B호텔");

  const cmds = parseGraphCommands("두 번째 예약해", g);
  assert.equal(cmds[0]?.op, "reserve_prep");
  if (cmds[0]?.op === "reserve_prep") {
    assert.ok(cmds[0].targetRef.nodeId);
  }

  const bareCompare = parseGraphCommands("비교해 봐", g);
  assert.equal(bareCompare[0]?.op, "compare");
}

// 2 — Analyze → reason_pick → Diff 실제 고르기 (selection 1개여도 visible pool)
{
  const g = seedGraph("evt-analyze");
  assert.equal(classifyIntentFamily("그거 어때?"), "Analyze");
  const pick = parseGraphCommands("그거 어때?", g);
  assert.equal(pick[0]?.op, "reason_pick");

  const run = runNaturalLanguagePipeline({
    utterance: "그거 어때?",
    contextEventId: "evt-analyze",
  });
  assert.equal(run.result?.via, "graph_command");
  if (run.result?.via === "graph_command") {
    assert.match(run.result.assistantReplyKo, /골랐어요|골라/);
  }

  const after = readSessionGraph("evt-analyze");
  assert.ok(after);
  const winner = after!.nodes.find((n) => n.attrs.reasonPick === true);
  assert.ok(winner);
  assert.equal(after!.selectionIds[0], winner!.id);
  // Pool pick among A/B — not stuck on sole selection when asking 어때
  assert.ok(
    typeof winner!.attrs.reasonSummaryKo === "string" &&
      String(winner!.attrs.reasonSummaryKo).includes("골랐어요"),
  );
}

// 3 — compounds +2
{
  assert.equal(isCompoundActionUtterance("숙소 찾아서 결제해"), true);
  assert.equal(isCompoundActionUtterance("싸게만 남기고 길 찾아"), true);
  assert.equal(
    buildActionPlan({
      utterance: "숙소 찾아서 결제해",
      contextEventId: "evt-sp",
    })?.planKind,
    "search_payment",
  );
  assert.equal(
    buildActionPlan({
      utterance: "싸게만 남기고 길 찾아",
      contextEventId: "evt-fn",
    })?.planKind,
    "filter_navigate",
  );
}

// 4 — synonyms
{
  assert.equal(classifyIntentFamily("잡아줘"), "Reserve");
  assert.equal(classifyIntentFamily("지워버려"), "Delete");
  assert.equal(classifyIntentFamily("카톡으로 공유해"), "Share");
  const g = seedGraph("evt-syn");
  assert.equal(parseGraphCommands("잡아줘", g)[0]?.op, "reserve_prep");
  assert.equal(parseGraphCommands("지워버려", g)[0]?.op, "delete_node");
  assert.equal(parseGraphCommands("카톡으로", g)[0]?.op, "share_context");
}

// Navigate deictic with coords
{
  const nav = tryRunContextNlAction({
    utterance: "그거 길 찾아",
    contextEventId: "evt-sel",
  });
  assert.ok(nav);
  assert.equal(nav!.via, "soft_command");
  if (nav!.via === "soft_command") {
    assert.ok(nav.mapsUrl);
  }
}

// Remaining gaps — compare_filter · move_share · negation · revise · create · group/note
{
  assert.equal(normalizeNlNegation("아니 그거 말고 두 번째"), "두 번째");
  assert.equal(normalizeNlNegation("예약은 말고 길만"), "길 찾아");

  assert.equal(isCompoundActionUtterance("비교해서 싸게만"), true);
  assert.equal(isCompoundActionUtterance("옮겨서 공유해"), true);
  const gCmp = seedGraph("evt-cmp-f");
  assert.equal(
    buildActionPlan({
      utterance: "비교해서 싸게만",
      contextEventId: "evt-cmp-f",
      graph: gCmp,
    })?.planKind,
    "compare_filter",
  );
  assert.equal(
    buildActionPlan({
      utterance: "옮겨서 공유해",
      contextEventId: "evt-ms",
      graph: gCmp,
    })?.planKind,
    "move_share",
  );

  assert.equal(classifyIntentFamily("다음 주로"), "Revise");
  assert.equal(classifyIntentFamily("아이랑"), "Revise");
  assert.equal(classifyIntentFamily("스위트 방으로"), "Revise");

  assert.ok(isCreateContextUtterance("오사카 여행 만들어"));
  assert.ok(isCreateContextUtterance("새 프로젝트 만들어"));
  const compiled = compileGlobeIngress({ text: "오사카 여행 만들어" });
  const draft = buildPendingContextCreateDraft({
    graphId: "evt-create-osaka",
    utterance: "오사카 여행 만들어",
    compiled,
  });
  assert.equal(draft.travelSlots.destination, "오사카");
  assert.match(draft.titleKo, /오사카/);

  const gGrp = seedGraph("evt-grp");
  assert.equal(parseGraphCommands("묶어줘", gGrp)[0]?.op, "group_nodes");
  assert.equal(parseGraphCommands("그거에 메모해", gGrp)[0]?.op, "create_note");
  assert.equal(parseGraphCommands("비 오면 어때", gGrp)[0]?.op, "simulate");

  clearSessionGraphs();
  const emptyGroup = runNaturalLanguagePipeline({
    utterance: "묶어줘",
    contextEventId: "evt-empty-group",
  });
  assert.equal(emptyGroup.result?.via, "clarify");
  if (emptyGroup.result?.via === "clarify") {
    assert.ok((emptyGroup.result.clarifyChips?.length ?? 0) >= 1);
  }

  seedGraph("evt-neg");
  const neg2 = runNaturalLanguagePipeline({
    utterance: "아니 그거 말고 두 번째 예약해",
    contextEventId: "evt-neg",
  });
  assert.ok(
    neg2.result?.via === "graph_command" || neg2.result?.via === "action_plan",
  );
}

console.log("ok — nl-selection-strengthen");
