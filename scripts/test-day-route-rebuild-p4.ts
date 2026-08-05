/**
 * P4 — Day surgery auto route rebuild (NN order + meters).
 * Run: npx tsx scripts/test-day-route-rebuild-p4.ts
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import {
  applyWorkspacePatch,
  parseWorkspacePatch,
} from "@/lib/context-workspace/workspace-patch";

const CTX = "ctx_p4_day_route";

function poi(
  id: string,
  title: string,
  lat: number,
  lng: number,
  day: number | null,
): ContextWorkspaceNode {
  return {
    id,
    kind: "poi",
    placeId: id,
    title,
    summaryKo: title,
    lat,
    lng,
    rating: 4.3,
    priceBand: null,
    amountLabel: null,
    thumbnailUrl: null,
    tags: day != null ? [`day_${day}`] : [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "search",
  };
}

clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "poi",
  query: "오사카",
  summaryKo: "Osaka",
  candidates: [],
});

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [
    poi("castle", "오사카성", 34.687, 135.526, null),
    poi("umeda", "우메다", 34.705, 135.498, 2),
    poi("namba", "난바", 34.665, 135.501, 2),
  ],
});

{
  const moved = applyWorkspacePatch({
    contextEventId: CTX,
    patch: parseWorkspacePatch("오사카성을 Day 2에 넣어줘")!,
    utterance: "오사카성을 Day 2에 넣어줘",
  });
  assert.equal(moved.ok, true);
  const after = readContextWorkspace(CTX)!;
  assert.ok(
    after.nodes.find((n) => n.id === "castle")!.tags.some((t) =>
      /day[_-]?2/i.test(t),
    ),
  );
  const dayRoutes = (after.relationshipEdges ?? []).filter((e) =>
    e.id.startsWith("route_day2_"),
  );
  assert.ok(dayRoutes.length >= 2, "auto rebuild creates day route edges");
  assert.ok(
    dayRoutes.every((e) => e.meters != null && e.meters > 0),
    "route edges have meters",
  );
  assert.match(moved.statusKo, /Day2|동선/);
}

{
  const rebuild = applyWorkspacePatch({
    contextEventId: CTX,
    patch: parseWorkspacePatch("Day 2 이동 동선 다시 짜줘")!,
    utterance: "Day 2 이동 동선 다시 짜줘",
  });
  assert.equal(rebuild.ok, true);
  assert.match(rebuild.statusKo, /동선/);
}

clearContextWorkspace(CTX);
console.log("ok — P4 day route rebuild (NN + meters + auto after move)");
