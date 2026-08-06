/**
 * L9 Conflict Replan smoke — duplicate lodging → replan remove + rebuild.
 * Run: npx tsx scripts/test-workspace-agent-conflict-replan.ts
 */
import assert from "node:assert/strict";
import { detectWorkspacePlanConflict } from "@/lib/context-run/detect-workspace-plan-conflict";
import { compileConflictReplanSteps } from "@/lib/context-run/replan-workspace-agent-plan";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";
import { runWorkspaceAgentPlan } from "@/lib/context-run/run-workspace-agent-plan";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { applyWorkspacePatch } from "@/lib/context-workspace/workspace-patch";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";

const CTX = "ctx_conflict_replan";

function lodging(id: string, title: string, day: number): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.66,
    lng: 135.5,
    rating: 4.1,
    priceBand: 2,
    amountLabel: "₩90,000",
    thumbnailUrl: null,
    tags: ["stay:hotel", `day_${day}`],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

clearCalloutWindowsForTests();
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "오사카",
  summaryKo: "Osaka Trip",
  candidates: [],
});
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [
    lodging("h_a", "난바 호텔 A", 1),
    lodging("h_b", "난바 호텔 B", 1),
  ],
  selectedIds: ["h_a"],
  updatedAtIso: new Date().toISOString(),
});
writeContextWorkspaceExpanded(CTX, true);

{
  const conflict = detectWorkspacePlanConflict({ contextEventId: CTX });
  assert.ok(conflict);
  assert.equal(conflict!.kind, "duplicate_lodging_day");
  assert.equal(conflict!.dayIndex, 0);

  const plan = compileWorkspaceAgentPlan({
    utterance: "Day 1 일정 정리해줘",
    contextEventId: CTX,
  });
  const steps = compileConflictReplanSteps({
    plan: { ...plan, contextEventId: CTX },
    conflict,
    failedStep: null,
  });
  assert.ok(steps && steps.length >= 1);
  assert.ok(steps!.some((s) => /호텔 B|빼/u.test(s.utterance)));
}

void (async () => {
  // Force conflict replan path via a tiny multi-step that mutates then rebuilds
  // — seed duplicate lodging, run a plan step that triggers detect.
  const applied = applyWorkspacePatch({
    contextEventId: CTX,
    patch: {
      kind: "rebuild_route",
      dayIndex: 0,
    },
    utterance: "Day 1 이동 동선 다시 짜줘",
  });
  assert.equal(applied.ok, true);

  // Manual replan apply — remove B
  const replan = compileConflictReplanSteps({
    plan: {
      ...compileWorkspaceAgentPlan({
        utterance: "Day 1 일정 정리해줘",
        contextEventId: CTX,
      }),
      contextEventId: CTX,
    },
    conflict: detectWorkspacePlanConflict({ contextEventId: CTX }),
    failedStep: null,
  })!;
  assert.ok(replan.length >= 1);

  const ran = await runWorkspaceAgentPlan({
    utterance: replan[0]!.utterance,
    explicitContextEventId: CTX,
    plan: {
      version: 1,
      planId: "wap_conflict_test",
      contextEventId: CTX,
      sourceUtterance: "Day 1 중복 숙소 정리",
      planKind: "day_modify_b",
      steps: [...replan],
      createdAtIso: new Date().toISOString(),
      cursor: 0,
    },
  });
  assert.equal(ran.stepsFailed, 0);
  assert.ok(ran.stepsDone >= 1);

  const after = readContextWorkspace(CTX)!;
  const day1Lodging = after.nodes.filter(
    (n) =>
      n.kind === "lodging" &&
      n.tags.some((t) => /^day[_-]?1$/i.test(t)),
  );
  assert.ok(
    day1Lodging.length <= 1,
    `expected ≤1 lodging on day1, got ${day1Lodging.length}`,
  );

  clearContextWorkspace(CTX);
  console.log("ok — Conflict Replan · duplicate lodging → remove + rebuild");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
