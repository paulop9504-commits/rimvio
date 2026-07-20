#!/usr/bin/env npx tsx
/**
 * Weak commands 3–8 — Purchase/Create · filter_reserve · empty Share ·
 * soft Navigate fail-closed · short affirm · Container dest-confirmed.
 */

import assert from "node:assert/strict";
import {
  buildActionPlan,
  buildFilterReserveActionPlan,
  isCompoundActionUtterance,
  tryRunContextNlAction,
} from "../lib/action-planner";
import {
  clearSessionGraphs,
  ensureSessionGraph,
  parseGraphCommands,
  resetGraphCommandStoreForTests,
  writeSessionGraph,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { clearLastContextPack } from "../lib/context-builder";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import { isSoftConfirmAffirmUtterance } from "../lib/globe/soft-confirm/soft-confirm-affirm";
import { isCreateContextUtterance } from "../lib/context-run/try-run-nl-context-create";
import { resetPendingContextCreateForTests } from "../lib/globe-ingress/pending-context-create-store";
import { classifyIntentFamily } from "../lib/rule-engine";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import { gateContainerAIRequest } from "../lib/container-ai";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();
resetPendingContextCreateForTests();

// 3 — Purchase IR + Create offer
{
  assert.equal(classifyIntentFamily("결제해"), "Purchase");
  assert.ok(isCreateContextUtterance("맥락 만들어"));

  let graph = ensureSessionGraph({ contextEventId: "evt-pay" });
  graph = {
    ...graph,
    nodes: [
      {
        id: "n1",
        labelKo: "APA 난바",
        kind: "lodging",
        lat: 34.66,
        lng: 135.5,
        rating: 4,
        walkMinutes: 5,
        reservable: true,
        localFavorite: false,
        priceBand: 2,
        pinned: true,
        visible: true,
        alwaysVisible: false,
        parentId: null,
        groupId: null,
        accent: "default",
        projectFolderKo: null,
        attrs: {},
      },
    ],
    selectionIds: ["n1"],
  };
  writeSessionGraph(graph);

  const payCmds = parseGraphCommands("결제해", graph);
  assert.equal(payCmds[0]?.op, "payment_prep");

  const pay = runNaturalLanguagePipeline({
    utterance: "결제해",
    contextEventId: "evt-pay",
  });
  assert.equal(pay.result?.via, "graph_command");
  assert.ok((pay.result?.reservedOpIds?.length ?? 0) >= 1);

  clearLastContextPack("evt-create");
  const create = runNaturalLanguagePipeline({
    utterance: "맥락 만들어",
    contextEventId: "evt-create",
  });
  assert.equal(create.result?.via, "clarify");
  if (create.result?.via === "clarify") {
    assert.ok((create.result.clarifyChips?.length ?? 0) >= 1);
  }
}

// 5 — filter + reserve compound
{
  assert.equal(
    isCompoundActionUtterance("싸게만 남기고 첫 번째 예약"),
    true,
  );
  const plan = buildFilterReserveActionPlan({
    utterance: "싸게만 남기고 첫 번째 예약",
    contextEventId: "evt-fr",
  });
  assert.ok(plan);
  assert.equal(plan!.planKind, "filter_reserve");
  assert.ok(plan!.steps.some((s) => s.graphCommand?.op === "filter"));
  assert.ok(plan!.steps.some((s) => s.graphCommand?.op === "reserve_prep"));
  assert.equal(buildActionPlan({
    utterance: "싸게만 남기고 첫 번째 예약",
    contextEventId: "evt-fr",
  })?.planKind, "filter_reserve");
}

// 6 — empty graph Reserve/Share → clarify chips (not silent blocked)
{
  clearSessionGraphs();
  resetGraphCommandStoreForTests();
  const emptyReserve = runNaturalLanguagePipeline({
    utterance: "예약해",
    contextEventId: "evt-empty-r",
  });
  assert.ok(emptyReserve.result);
  assert.ok(
    emptyReserve.result!.via === "clarify" ||
      emptyReserve.result!.via === "reason",
  );
  if (
    emptyReserve.result!.via === "clarify" ||
    emptyReserve.result!.via === "reason"
  ) {
    assert.ok((emptyReserve.result.clarifyChips?.length ?? 0) >= 1);
  }

  const emptyShare = runNaturalLanguagePipeline({
    utterance: "공유해",
    contextEventId: "evt-empty-s",
  });
  assert.ok(emptyShare.result);
  assert.ok(
    emptyShare.result!.via === "clarify" ||
      emptyShare.result!.via === "reason",
  );
}

// 7 — Navigate without place → no fake soft success
{
  const nav = tryRunContextNlAction({
    utterance: "길 찾아",
    contextEventId: "evt-nav-miss",
  });
  assert.ok(nav);
  assert.ok(nav!.via === "clarify" || nav!.via === "reason");
  assert.notEqual(nav!.via, "soft_command");
}

// 8 — short affirm + Container dest-confirmed
{
  assert.equal(isSoftConfirmAffirmUtterance("응 그렇게 해줘"), true);
  assert.equal(isSoftConfirmAffirmUtterance("그렇게"), true);
  assert.equal(isSoftConfirmAffirmUtterance("응"), true);

  const blueprint = composeTravelTripBlueprint({
    contextId: "evt-gate",
    runtimeId: "rt-gate",
    goal: "오사카 여행",
  });
  const blocked = gateContainerAIRequest({
    blueprint,
    userMessage: "주변 호텔",
    activeNodeId: "prepare",
  });
  assert.equal(blocked.allowed, false);
  const allowed = gateContainerAIRequest({
    blueprint,
    userMessage: "주변 호텔",
    activeNodeId: "prepare",
    destinationConfirmed: true,
  });
  assert.equal(allowed.allowed, true);
}

console.log("ok — weak-commands-3-8");
