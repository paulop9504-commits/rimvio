/**
 * Command-first orchestration — execute high-confidence SearchHotel, don't quiz.
 * Run: npx tsx scripts/test-command-first.ts
 */

import assert from "node:assert/strict";
import {
  resolveCommandFirstDecision,
  shouldExecuteWithoutAsk,
} from "@/lib/rimvio-command/command-first";
import { planOneShotLodgingPrep } from "@/lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import { lodgingSearchEnginePackage } from "@/lib/engine/packages/lodging-search-package";
import { gateOperatorTurnSync } from "@/lib/globe/operator-turn/gate-operator-turn";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { OperatorTurnSsot } from "@/lib/globe/operator-turn/types";

const tokyoEvent = {
  id: "ctx-tokyo",
  title: "도쿄",
  place: "도쿄",
  datetime: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  category: "travel",
  metadata: {
    workspaceKind: "travel",
    globeManualContext: true,
    targetingSource: "experience_run",
    travelDestination: "도쿄",
    globePlaceLat: 35.6762,
    globePlaceLng: 139.6503,
    globePlaceLabel: "도쿄",
  },
} as unknown as EventCandidate;

{
  const d = resolveCommandFirstDecision({
    utterance: "숙소 찾아줘",
    activeContextId: "ctx-tokyo",
    activeWorkspaceKind: "travel",
  });
  assert.equal(d.action, "execute");
  assert.equal(d.commandId, "search_hotel");
  assert.ok(shouldExecuteWithoutAsk(d));
}

{
  const d = resolveCommandFirstDecision({
    utterance: "맛집 찾아줘",
    activeContextId: "ctx-tokyo",
    activeWorkspaceKind: "travel",
  });
  assert.equal(d.action, "execute");
  assert.equal(d.commandId, "search_eatery");
}

{
  const d = resolveCommandFirstDecision({
    utterance: "좋은 곳",
    activeContextId: "ctx-tokyo",
    activeWorkspaceKind: "travel",
  });
  assert.equal(d.action, "ask");
  assert.ok(d.confidence < 0.6);
}

{
  const plan = planOneShotLodgingPrep({
    message: "숙소 찾아줘",
    event: tokyoEvent,
  });
  assert.ok(plan);
  assert.equal(plan!.readyForScout, true, "search-only must scout without dates");
  const op = lodgingSearchEnginePackage.toOperatorPlan!({
    engineId: "lodging_search",
    executorId: "lodging",
    containerKind: "travel",
    goal: { id: "lodging_search.complete", goalKo: "x" },
    message: plan!.message,
    readyForScout: plan!.readyForScout,
    steps: plan!.steps,
    domainPlan: plan!,
  });
  assert.equal(op?.tool, "scout");
}

{
  const ssot = {
    contextEventId: "ctx-tokyo",
    scoutContract: null,
    selectedAnchor: null,
    lensSession: null,
    lastBatch: null,
    reelKinds: [],
    reelItemCount: 0,
    composeTail: [],
    hasActiveSpec: false,
    explorationMode: "diffuse",
  } as unknown as OperatorTurnSsot;

  const operatorPlan = gateOperatorTurnSync({
    text: "숙소 찾아줘",
    ssot,
    event: tokyoEvent,
  });
  assert.equal(
    operatorPlan.tool,
    "scout",
    `expected scout, got ${operatorPlan.tool} (${operatorPlan.reason})`,
  );
}

console.log("OK — command-first");
