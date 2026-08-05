/**
 * P5 — scout_refine_day Observe→Act→Verify plan compile + step verify.
 * Run: npx tsx scripts/test-scout-refine-day-p5.ts
 */
import assert from "node:assert/strict";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";
import { assertAgentPostcondition } from "@/lib/agent-policy/postcondition-check";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { applyWorkspacePatch, parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";

const ACCEPT =
  "난바역 근처 호텔 찾아줘. 가성비 좋은 것 3개만 보여주고 Day 2에 넣어줘.";

const plan = compileWorkspaceAgentPlan({ utterance: ACCEPT });
assert.equal(plan.planKind, "scout_refine_day");
assert.equal(plan.steps.length, 4);
assert.ok(plan.steps.every((s) => s.status === "pending"));

const CTX = "ctx_p5_scout_refine";
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "난바 호텔",
  summaryKo: "Namba",
  candidates: [],
});

function hotel(id: string, title: string, band: number): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.665,
    lng: 135.501,
    rating: 4.3,
    priceBand: band,
    amountLabel: `₩${band * 40_000}`,
    thumbnailUrl: null,
    tags: ["stay:hotel"],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "search",
  };
}

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [
    hotel("h1", "Premium", 4),
    hotel("h2", "Value", 2),
    hotel("h3", "Budget", 1),
    hotel("h4", "Mid", 3),
  ],
});

{
  const pc = assertAgentPostcondition({
    contextEventId: CTX,
    expect: {
      workspaceMutated: true,
      target: "lodging",
      minVisible: 3,
    },
  });
  assert.equal(pc.ok, true);
}

applyWorkspacePatch({
  contextEventId: CTX,
  patch: parseWorkspacePatch("이중에 가성비 좋은 것만 3개")!,
  utterance: "이중에 가성비 좋은 것만 3개",
});

applyWorkspacePatch({
  contextEventId: CTX,
  patch: parseWorkspacePatch("첫 번째 호텔을 Day 2에 넣어줘")!,
  utterance: "첫 번째 호텔을 Day 2에 넣어줘",
});

{
  const pc = assertAgentPostcondition({
    contextEventId: CTX,
    expect: { workspaceMutated: true, requireDay: 2 },
  });
  assert.equal(pc.ok, true);
}

const after = readContextWorkspace(CTX)!;
assert.ok(
  after.nodes.some((n) => n.tags.some((t) => /day[_-]?2/i.test(t))),
);
assert.ok(
  (after.relationshipEdges ?? []).some(
    (e) =>
      e.id.startsWith("schedule_") && e.id.includes("day2") ||
      e.id.startsWith("route_day2_"),
  ),
  "day schedule edge present",
);

clearContextWorkspace(CTX);
console.log("ok — P5 scout_refine_day compile · verify · day+route");
