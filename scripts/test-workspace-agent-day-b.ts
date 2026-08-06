/**
 * Day B 실행력 smoke:
 * compile day_modify_b → remove_schedule → move_schedule → rebuild_route
 * Run: npx tsx scripts/test-workspace-agent-day-b.ts
 */
import assert from "node:assert/strict";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";
import { runWorkspaceAgentPlan } from "@/lib/context-run/run-workspace-agent-plan";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import {
  parseWorkspacePatch,
  applyWorkspacePatch,
} from "@/lib/context-workspace/workspace-patch";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { publishGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";

const CTX = "ctx_day_b_exec";

function poi(
  id: string,
  title: string,
  day: number | null,
): ContextWorkspaceNode {
  return {
    id,
    kind: "poi",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.68,
    lng: 135.52,
    rating: 4.4,
    priceBand: null,
    amountLabel: null,
    thumbnailUrl: null,
    tags: day != null ? [`day_${day}`] : [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

{
  const rm = parseWorkspacePatch("Day 2에서 우메다 빼줘");
  assert.equal(rm?.kind, "remove_schedule");
  if (rm?.kind === "remove_schedule") {
    assert.equal(rm.dayIndex, 1);
    assert.ok(rm.queryIncludes?.includes("우메다"));
  }
  const rebuild = parseWorkspacePatch("Day 2 이동 동선 다시 짜줘");
  assert.equal(rebuild?.kind, "rebuild_route");
  if (rebuild?.kind === "rebuild_route") {
    assert.equal(rebuild.dayIndex, 1);
  }
  const add = parseWorkspacePatch("오사카성을 Day 2에 넣어줘");
  assert.equal(add?.kind, "move_schedule");
  if (add?.kind === "move_schedule") {
    assert.equal(add.dayIndex, 1);
    assert.ok(add.queryIncludes?.includes("오사카성"));
  }
}

{
  const plan = compileWorkspaceAgentPlan({
    utterance: "Day 2 일정 너무 빡빡한데 우메다는 빼고 오사카성 넣어줘",
    contextEventId: CTX,
  });
  assert.equal(plan.planKind, "day_modify_b");
  assert.equal(plan.steps.length, 3);
  assert.equal(plan.steps[0]!.kind, "workspace_patch");
  assert.equal(plan.steps[1]!.kind, "workspace_patch");
  assert.equal(plan.steps[2]!.kind, "workspace_patch");
}

clearCalloutWindowsForTests();
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "poi",
  query: "오사카 일정",
  summaryKo: "Osaka Trip",
  candidates: [],
});
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [
    poi("p_umeda", "우메다 스카이빌딩", 2),
    poi("p_castle", "오사카성", null),
    poi("p_namba", "난바 야사카", 2),
  ],
  selectedIds: [],
  relationshipEdges: [
    {
      id: "schedule_p_umeda_day2",
      kind: "route",
      fromId: "p_umeda",
      toId: "schedule:day2",
      labelKo: "Day2 Draft",
      meters: null,
    },
    {
      id: "schedule_p_namba_day2",
      kind: "route",
      fromId: "p_namba",
      toId: "schedule:day2",
      labelKo: "Day2 Draft",
      meters: null,
    },
  ],
  updatedAtIso: new Date().toISOString(),
});
writeContextWorkspaceExpanded(CTX, true);
publishGlobeProjectionLayerPolicy({
  mode: "focus",
  activeContextEventId: CTX,
  visiblePlaceIds: [],
});

{
  const applied = applyWorkspacePatch({
    contextEventId: CTX,
    patch: parseWorkspacePatch("Day 2에서 우메다 빼줘")!,
    utterance: "Day 2에서 우메다 빼줘",
  });
  assert.equal(applied.ok, true);
  const after = readContextWorkspace(CTX)!;
  assert.equal(
    after.nodes.find((n) => n.id === "p_umeda")!.tags.some((t) => /day/i.test(t)),
    false,
  );
}

void (async () => {
  // Reset day tags for full plan run
  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    nodes: [
      poi("p_umeda", "우메다 스카이빌딩", 2),
      poi("p_castle", "오사카성", null),
      poi("p_namba", "난바 야사카", 2),
    ],
    selectedIds: [],
    updatedAtIso: new Date().toISOString(),
  });

  const ran = await runWorkspaceAgentPlan({
    utterance: "Day 2 일정 너무 빡빡한데 우메다는 빼고 오사카성 넣어줘",
    explicitContextEventId: CTX,
  });
  assert.equal(ran.plan.planKind, "day_modify_b");
  assert.ok(ran.stepsDone >= 2, `expected ≥2 steps done, got ${ran.stepsDone}`);
  assert.equal(ran.stepsFailed, 0);

  const after = readContextWorkspace(CTX)!;
  assert.equal(
    after.nodes.find((n) => n.id === "p_umeda")!.tags.some((t) => /^day[_-]?2$/i.test(t)),
    false,
    "umeda removed from day 2",
  );
  assert.ok(
    after.nodes.find((n) => n.id === "p_castle")!.tags.some((t) => /^day[_-]?2$/i.test(t)),
    "castle added to day 2",
  );

  // Agent turn routes multi-step plan
  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    nodes: [
      poi("p_umeda", "우메다 스카이빌딩", 2),
      poi("p_castle", "오사카성", null),
      poi("p_namba", "난바 야사카", 2),
    ],
    selectedIds: [],
    updatedAtIso: new Date().toISOString(),
  });
  const turn = await applyGlobeWorkspaceAgentTurn({
    utterance: "Day 2 일정 너무 빡빡한데 우메다는 빼고 오사카성 넣어줘",
    explicitContextEventId: CTX,
  });
  assert.equal(turn.handled, true);
  assert.equal(turn.committed, false);
  assert.ok(turn.workspaceMutated);
  assert.ok(turn.statusKo);

  clearContextWorkspace(CTX);
  console.log("ok — Day B remove_schedule · move_schedule · rebuild_route · plan run");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
