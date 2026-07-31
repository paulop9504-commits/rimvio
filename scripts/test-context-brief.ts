/**
 * Context Brief — deterministic graph summary + Replay runner smoke.
 */
import assert from "node:assert/strict";
import {
  buildContextBrief,
  buildNodeContextBrief,
  buildBriefReplayStops,
  runWorkspaceBriefReplay,
} from "../lib/context-workspace/context-brief";
import {
  clearContextWorkspace,
  prepareTripWorkspaceDraft,
  readContextWorkspace,
  readWorkspaceChat,
  clearWorkspaceChat,
} from "../lib/context-workspace";

const CTX = "test:context-brief:osaka";

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 만들어줘",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
  },
  expand: false,
});

assert.ok(state, "trip draft state");
assert.ok(state!.nodes.length >= 3, "nodes on map");

const brief = buildContextBrief(state!);
assert.ok(brief, "brief from graph");
assert.match(brief!.titleKo, /오사카/);
assert.match(brief!.thesisKo, /이동|동선|일정/);
assert.ok(brief!.groundsKo.length >= 1 && brief!.groundsKo.length <= 4);
assert.ok(brief!.roles.some((r) => r.kind === "stay"), "stay role");
assert.ok(brief!.nodeIdsInOrder.length === state!.nodes.filter((n) => n.visible).length);

const replayStops = buildBriefReplayStops(state!);
assert.ok(replayStops.length >= 3, "brief replay stops");
assert.equal(
  replayStops[0]!.id,
  brief!.nodeIdsInOrder[0],
  "replay order matches brief",
);
if (state!.realityDraft?.days[0]?.nodes[0]) {
  assert.equal(
    replayStops[0]!.id,
    state!.realityDraft.days[0]!.nodes[0]!.nodeId,
    "day1 first stop leads Globe/MapLibre tour",
  );
}

const emptyBrief = buildContextBrief({
  ...state!,
  nodes: [],
});
assert.equal(emptyBrief, null, "empty nodes → null brief");

const lodging = state!.nodes.find((n) => n.kind === "lodging");
assert.ok(lodging);
const mini = buildNodeContextBrief(lodging!, {
  dayIndex: 0,
  anchorTitle: lodging!.title,
});
assert.ok(mini.linesKo.length >= 1 && mini.linesKo.length <= 3);

const turns = readWorkspaceChat(CTX);
const assistant = [...turns].reverse().find((t) => t.role === "assistant");
assert.ok(assistant?.contextBrief, "chat turn carries Context Brief");
assert.ok(
  !(assistant!.dayPlanLines?.length) ||
    assistant!.dayPlanLines!.every((l) => !/^Day\d/u.test(l)),
  "no Day1 essay when Brief present",
);

const visited: string[] = [];
void (async () => {
  await runWorkspaceBriefReplay({
    stops: brief!.nodeIdsInOrder.slice(0, 3).map((id) => {
      const n = state!.nodes.find((x) => x.id === id)!;
      return { id, lat: n.lat, lng: n.lng };
    }),
    stepMs: 10,
    flyTo: async (stop) => {
      visited.push(stop.id);
    },
  });
  assert.equal(visited.length, 3, "replay visits stops");

  clearWorkspaceChat(CTX);
  clearContextWorkspace(CTX);
  console.log("ok: context brief + replay");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
