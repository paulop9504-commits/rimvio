#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { canTransitionContextAgentWorkPhase } from "../lib/globe/context-agent/context-agent-work-phase";
import {
  gateOperatorTurnSync,
  hasOpenDiscoverySurface,
} from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";
import { buildContextPack } from "../lib/context-builder/build-context-pack";
import {
  ensureSessionGraph,
  writeSessionGraph,
  deleteSessionGraph,
} from "../lib/graph-command/session-graph-store";
import { alignSessionGraphDiscoveryToScout } from "../lib/graph-command/align-session-graph-lodging-to-scout";

const emptySsot = (patch: Partial<OperatorTurnSsot> = {}): OperatorTurnSsot => ({
  contextEventId: "evt-continuous",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: false,
  explorationMode: "convergent",
  ...patch,
});

// 8 — FSM: awaiting_human → scouting
assert.equal(
  canTransitionContextAgentWorkPhase("awaiting_human", "scouting"),
  true,
);
assert.equal(
  canTransitionContextAgentWorkPhase("awaiting_human", "collecting_context"),
  true,
);

// 2 — edit-before-scout when lastBatch open
const openSsot = emptySsot({
  lastBatch: {
    batchId: "b1",
    count: 2,
    summaryKo: "2곳",
    atIso: new Date().toISOString(),
    recommendations: [
      {
        kind: "lodging",
        title: "난바 캡슐",
        reasonKo: "가깝",
        placeId: "p1",
        lat: 34.66,
        lng: 135.5,
      },
    ],
  },
  hasActiveSpec: true,
});
assert.equal(hasOpenDiscoverySurface(openSsot), true);

const filterPlan = gateOperatorTurnSync({
  text: "더 싸게",
  ssot: openSsot,
});
assert.equal(filterPlan.tool, "graph_command");

const askSoftened = gateOperatorTurnSync({
  text: "근처 호텔 더 찾아줘",
  ssot: openSsot,
  event: null,
});
assert.notEqual(askSoftened.tool, "ask_chips");

// 3 — align discovery SSOT
deleteSessionGraph("evt-align");
const g0 = ensureSessionGraph({
  contextEventId: "evt-align",
  anchorLat: 34.66,
  anchorLng: 135.5,
});
writeSessionGraph({
  ...g0,
  nodes: [
    {
      id: "stale-apa",
      kind: "lodging",
      labelKo: "APA Hotel",
      lat: 34.7,
      lng: 135.5,
      rating: null,
      walkMinutes: null,
      pinned: false,
      visible: true,
      alwaysVisible: false,
      reservable: true,
      localFavorite: false,
      priceBand: null,
      parentId: null,
      groupId: null,
      accent: "default",
      projectFolderKo: null,
      attrs: { catalogId: "apa-1" },
    },
    {
      id: "keep-capsule",
      kind: "lodging",
      labelKo: "난바 캡슐",
      lat: 34.66,
      lng: 135.5,
      rating: null,
      walkMinutes: null,
      pinned: false,
      visible: true,
      alwaysVisible: false,
      reservable: true,
      localFavorite: false,
      priceBand: null,
      parentId: null,
      groupId: null,
      accent: "default",
      projectFolderKo: null,
      attrs: { catalogId: "p1" },
    },
  ],
});
const aligned = alignSessionGraphDiscoveryToScout({
  contextEventId: "evt-align",
  scoutPlaceIds: ["p1"],
  scoutLabelsKo: ["난바 캡슐"],
  kinds: ["lodging"],
});
assert.ok(aligned);
assert.equal(aligned!.nodes.length, 1);
assert.equal(aligned!.nodes[0]?.labelKo, "난바 캡슐");

// 6 — Context pack includes discovery place ids
const pack = buildContextPack({
  utterance: "이거 고정해줘",
  graph: aligned,
  discoveryPlaceIds: ["p1", "keep-capsule"],
});
assert.ok(pack.nodes.some((n) => n.labelKo === "난바 캡슐"));

deleteSessionGraph("evt-align");
console.log("test-continuous-map-work: ok");
