/**
 * Smoke: Intent → Compare Decision Pipeline
 * "호텔 비교해줘" → Compare Intent → weights → candidates → Decision → Map projection
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceProjectionForTests,
  isCompareDecisionProjectionActive,
  openMapContextWorkspace,
  parseCompareIntent,
  readContextWorkspace,
  readWorkspaceProjection,
  runCompareDecisionPipeline,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { writeContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { resolveWorkspaceIntent } from "@/lib/workspace-command/intent-resolver";
import { createWorkspaceCommand } from "@/lib/workspace-command/command-parser";
import { tryApplyWorkspaceLodgingTurnSync } from "@/lib/context-workspace/try-apply-workspace-lodging-turn";

function node(
  id: string,
  title: string,
  kind: ContextWorkspaceNode["kind"],
  lat: number,
  lng: number,
): ContextWorkspaceNode {
  return {
    id,
    kind,
    placeId: id,
    title,
    summaryKo: title,
    lat,
    lng,
    rating: 4.5,
    priceBand: 2,
    amountLabel: kind === "lodging" ? "120000원" : null,
    thumbnailUrl: null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "test",
  };
}

clearWorkspaceProjectionForTests();

const ctx = `cmp_intent_${Date.now()}`;
openMapContextWorkspace({
  contextEventId: ctx,
  query: "osaka hotels",
  domain: "lodging",
  hits: [],
});
let state = readContextWorkspace(ctx)!;
writeContextWorkspace({
  ...state,
  summaryKo: "Osaka Trip",
  realityDraft: {
    draftId: "d1",
    contextTitleKo: "Osaka Trip",
    destinationKo: "오사카",
    stayLabelKo: "3박",
    status: "prepared",
    days: [],
    nodeIds: ["h1", "h2", "r1"],
    updatedAtIso: new Date().toISOString(),
  },
  nodes: [
    node("h1", "Hotel A", "lodging", 34.66, 135.43),
    node("h2", "Hotel B", "lodging", 34.67, 135.5),
    node("r1", "라멘집", "eatery", 34.66, 135.44),
  ],
  relationshipEdges: [
    {
      id: "rel:route:h1:usj",
      kind: "route",
      fromId: "h1",
      toId: "h2",
      labelKo: "도보 12분",
      meters: 900,
    },
  ],
  compareIds: [],
  selectedIds: [],
});

// 1. Schema parse
const intent = parseCompareIntent({
  utterance: "호텔 비교해줘",
  contextId: ctx,
  sessionDomain: "lodging",
});
assert.ok(intent);
assert.equal(intent!.intent, "compare");
assert.equal(intent!.target, "hotel");
assert.equal(intent!.criteriaFromContext, true);
assert.equal(intent!.contextId, ctx);

// restaurant target
assert.equal(
  parseCompareIntent({ utterance: "맛집 비교해줘", contextId: ctx })?.target,
  "restaurant",
);
assert.equal(
  parseCompareIntent({ utterance: "병원 비교", contextId: ctx })?.target,
  "hospital",
);

// 2. Intent resolver — not hotel-hardcoded for restaurant
const cmd = createWorkspaceCommand({
  workspaceId: ctx,
  rawText: "맛집 비교해줘",
});
const wsIntent = resolveWorkspaceIntent(cmd);
assert.equal(wsIntent?.action, "compare");
assert.equal(wsIntent?.target, "restaurant");
assert.equal(wsIntent?.parameters.projectionMode, "compare_decision");

// 3. Full pipeline
const result = runCompareDecisionPipeline({
  utterance: "호텔 비교해줘",
  contextEventId: ctx,
});
assert.equal(result.ok, true);
assert.equal(result.intent?.target, "hotel");
assert.ok(result.weights);
assert.equal(result.weights!.location, 0.4);
assert.ok(result.candidateEntityIds.length >= 2);
assert.ok(result.candidateEntityIds.every((id) => id === "h1" || id === "h2"));
assert.ok(!result.candidateEntityIds.includes("r1"), "hotel compare skips eatery");
assert.ok(result.decisions.every((d) => d.mode === "compare_decision"));
assert.equal(result.projection?.mode, "compare_decision");
assert.equal(isCompareDecisionProjectionActive(ctx), true);

const proj = readWorkspaceProjection(ctx);
assert.equal(proj.mode, "compare_decision");

// 4. NL sync turn wires same pipeline
clearWorkspaceProjectionForTests();
writeContextWorkspace({
  ...readContextWorkspace(ctx)!,
  compareIds: [],
});
const turn = tryApplyWorkspaceLodgingTurnSync({
  utterance: "호텔 비교해줘",
  contextEventId: ctx,
});
assert.equal(turn.handled, true);
assert.ok(turn.replyKo?.includes("숙소") || turn.replyKo?.includes("판단"));
assert.equal(isCompareDecisionProjectionActive(ctx), true);

clearContextWorkspace(ctx);
clearWorkspaceProjectionForTests();

console.log("ok compare-decision-intent-pipeline", {
  intent,
  candidates: result.candidateEntityIds,
  totals: result.decisions.map((d) => d.scores.total),
});
