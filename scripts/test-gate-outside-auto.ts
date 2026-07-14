#!/usr/bin/env npx tsx
/**
 * Gate-outside Auto — expressReady Act + lodging auto_scout + departure keeps plan.
 */

import assert from "node:assert/strict";
import { resolvePlanStepAutoAdvance } from "../lib/context-execution/resolve-plan-step-auto-advance";
import type { ContextExecutionPlanV1 } from "../lib/context-execution/types";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";
import { compileGlobeIngress } from "../lib/globe-ingress";
import { getDepartureHubAirport } from "../lib/globe/departure-hub-airports";
import {
  advanceRealitySurfaceDepartureHub,
  advanceRealitySurfaceDestination,
  blueprintNeedsDepartureConfirm,
  composeRealitySurfaceFromGlobeIngress,
} from "../lib/reality-surface";
import type { EventCandidate } from "../lib/events/event-candidate";

const emptySsot: OperatorTurnSsot = {
  contextEventId: "evt-auto",
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

function basePlan(
  engineId: ContextExecutionPlanV1["steps"][number]["engineId"],
  labelKo: string,
): ContextExecutionPlanV1 {
  const now = new Date().toISOString();
  return {
    version: 1,
    contextId: "evt-auto",
    goalKo: "테스트",
    osPhase: "executing",
    approval: "approved",
    currentStepId: "step-1",
    steps: [
      {
        stepId: "step-1",
        nodeId: "stay",
        order: 1,
        labelKo,
        engineId,
        status: "running",
        lastError: null,
        updatedAtIso: now,
      },
    ],
    createdAtIso: now,
    updatedAtIso: now,
  };
}

function osakaTripEvent(): EventCandidate {
  return {
    id: "evt-osaka",
    title: "오사카 여행",
    category: "travel",
    source: "chat",
    lifecycle: "active",
    datetime: "2026-08-01T10:00:00.000Z",
    place: "오사카",
    confidence: 0.9,
    metadata: {
      planPeerDisplayName: "민수",
    },
    lifecycleUpdatedAt: "2026-08-01T10:00:00.000Z",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  };
}

const lodging = resolvePlanStepAutoAdvance({
  plan: basePlan("lodging_search", "숙소"),
  event: osakaTripEvent(),
});
assert.equal(
  lodging.kind,
  "auto_scout",
  `lodging stay step should auto_scout, got ${lodging.kind}`,
);

const withoutExpress = gateOperatorTurnSync({
  text: "오사카 주변 호텔 찾아줘",
  ssot: emptySsot,
  event: osakaTripEvent(),
  expressReady: false,
});
const withExpress = gateOperatorTurnSync({
  text: "오사카 주변 호텔 찾아줘",
  ssot: emptySsot,
  event: osakaTripEvent(),
  expressReady: true,
});
assert.equal(
  withExpress.tool,
  "scout",
  `expressReady Act must scout, got ${withExpress.tool}`,
);
assert.ok(
  withoutExpress.tool === "scout" || withoutExpress.tool === "ask_chips",
  "non-express may scout or chips depending on intake",
);
if (withoutExpress.tool === "ask_chips") {
  assert.notEqual(
    withExpress.tool,
    "ask_chips",
    "expressReady must not bounce to chips when destination known",
  );
}

const compiled = compileGlobeIngress({ text: "일본 여행" });
let session = composeRealitySurfaceFromGlobeIngress({
  compiled,
  eventId: "evt-japan-dep",
});
session = advanceRealitySurfaceDestination({
  session,
  destinationLabel: "오사카",
});
assert.ok(session.executionPlan, "destination patch must keep plan");
const planBefore = session.executionPlan;
assert.equal(blueprintNeedsDepartureConfirm(session.operatorBlueprint), true);

const hub = getDepartureHubAirport("icn");
session = advanceRealitySurfaceDepartureHub({
  session,
  hub,
  homeLabel: "집",
  homeLat: 37.5,
  homeLng: 127.0,
});
assert.ok(
  session.executionPlan,
  "departure confirm must preserve executionPlan (Auto needs it)",
);
assert.equal(session.executionPlan?.contextId, planBefore?.contextId);

console.log("✓ expressReady Act + lodging auto_scout + departure keeps plan");
