/**
 * P6 Budget/Timeline derived projection + P7 demote + catalog skeleton.
 */
import assert from "node:assert/strict";
import {
  deriveBudgetRollup,
  nodesForCapabilityDay,
  parseAmountLabelKrw,
} from "@/lib/workspace-capability/derive-budget-timeline";
import {
  buildWorkspaceCapabilityViewModel,
  capabilityChromeNeeded,
} from "@/lib/workspace-capability/project-capability-view-model";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { mergeScoutInventoryNodes } from "@/lib/context-workspace/merge-preserve-pinned";
import { prepareCatalogWorkspaceStub } from "@/lib/workspace-kind/prepare-catalog-workspace-stub";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "@/lib/graph-command";

assert.equal(parseAmountLabelKrw("₩12만"), 120_000);
assert.equal(parseAmountLabelKrw("120,000원"), 120_000);

const baseState = {
  version: 1 as const,
  workspaceId: "ws_p6",
  contextEventId: "ctx_p6",
  domain: "lodging" as const,
  status: "editing" as const,
  query: "오사카 숙소",
  summaryKo: "오사카",
  nodes: [
    {
      id: "h1",
      kind: "lodging" as const,
      placeId: "h1",
      title: "호텔 A",
      summaryKo: "호텔 A",
      lat: 34.66,
      lng: 135.5,
      rating: 4.2,
      priceBand: 2,
      amountLabel: "₩10만",
      thumbnailUrl: null,
      tags: ["day:1"],
      visible: true,
      selected: false,
      bookmarked: false,
      source: "maps" as const,
    },
    {
      id: "h2",
      kind: "lodging" as const,
      placeId: "h2",
      title: "호텔 B",
      summaryKo: "호텔 B",
      lat: 34.67,
      lng: 135.51,
      rating: 4.0,
      priceBand: 3,
      amountLabel: "₩15만",
      thumbnailUrl: null,
      tags: ["day:2"],
      visible: true,
      selected: false,
      bookmarked: false,
      source: "maps" as const,
    },
  ],
  filter: {},
  selectedIds: [],
  compareIds: [],
  surfacePrimary: "embedded_preview" as const,
  openedAtIso: new Date().toISOString(),
  updatedAtIso: new Date().toISOString(),
  committedAtIso: null,
  lastChangeKo: null,
  lastWhy: null,
  history: [],
  future: [],
  relationshipEdges: [],
  compilerIr: null,
  realityDraft: {
    destinationKo: "오사카",
    stayLabelKo: "3박4일",
    days: [
      { day: 1, labelKo: "Day 1", lineKo: "", emoji: null, nodes: [{ nodeId: "h1" }] },
      { day: 2, labelKo: "Day 2", lineKo: "", emoji: null, nodes: [{ nodeId: "h2" }] },
    ],
  },
  constraintMemory: {
    maxNightlyPriceKrw: 120_000,
    maxPriceBand: null,
    destinationKo: "오사카",
    nearLabelKo: null,
    stayType: null,
    minRating: null,
    keepTopN: null,
    sortBy: null,
    updatedAtIso: new Date().toISOString(),
  },
} as unknown as ContextWorkspaceState;

{
  const day1 = nodesForCapabilityDay(baseState, 1);
  assert.equal(day1[0]?.id, "h1");
  const budget = deriveBudgetRollup(baseState);
  assert.equal(budget.nightlySumKrw, 250_000);
  assert.equal(budget.nights, 3);
  assert.equal(budget.overBudget, true);
  assert.match(budget.labelKo, /상한|초과|합/);

  const layoutBudget = {
    contextEventId: "ctx_p6",
    intentId: "trip_plan" as const,
    items: [
      {
        id: "budget" as const,
        open: true,
        size: "m" as const,
        slot: "primary" as const,
        order: 0,
      },
    ],
    focusedDay: 1,
    updatedAtIso: new Date().toISOString(),
  };
  const layoutFull = {
    ...layoutBudget,
    items: [
      {
        id: "timeline" as const,
        open: true,
        size: "m" as const,
        slot: "primary" as const,
        order: 0,
      },
      {
        id: "budget" as const,
        open: true,
        size: "m" as const,
        slot: "side" as const,
        order: 1,
      },
      {
        id: "day_rail" as const,
        open: true,
        size: "s" as const,
        slot: "rail" as const,
        order: 2,
      },
    ],
  };

  const vm = buildWorkspaceCapabilityViewModel({
    state: baseState,
    layout: layoutFull,
  });
  assert.ok(vm.budget.nightlySumKrw === 250_000);
  assert.equal(vm.timeline[0]?.title, "호텔 A");
  assert.equal(capabilityChromeNeeded(layoutBudget), true, "budget gates chrome");
}

{
  resetGraphCommandStoreForTests();
  clearSessionGraphs();
  clearCalloutWindowsForTests();
  const stub = prepareCatalogWorkspaceStub({
    utterance: "삼성전자 주식 분석해줘",
    route: "finance",
  });
  assert.equal(stub.morphologyId, "ledger");
  const ws = readContextWorkspace(stub.contextEventId);
  assert.ok(ws);
  assert.ok(ws!.nodes.some((n) => n.tags.includes("ready_slot")));
  assert.ok(ws!.nodes.some((n) => n.tags.includes("ledger")));
}

{
  const usj = {
    id: "usj",
    placeId: "usj",
    title: "유니버설 스튜디오 재팬",
    kind: "poi" as const,
    source: "trip_prep_draft" as const,
    summaryKo: "USJ",
    lat: 34.66,
    lng: 135.43,
    rating: 4.5,
    priceBand: null,
    amountLabel: "티켓",
    thumbnailUrl: null,
    tags: [] as string[],
    visible: true,
    selected: true,
    bookmarked: false,
  };
  const hotel = {
    ...usj,
    id: "h",
    placeId: "h",
    title: "난바 호텔",
    kind: "lodging" as const,
    source: "maps" as const,
    amountLabel: "₩11만",
    selected: false,
  };
  const out = mergeScoutInventoryNodes({
    previous: [usj],
    incoming: [hotel],
    domain: "lodging",
    mode: "replace",
  });
  assert.equal(out.find((n) => n.placeId === "usj")?.visible, false);
  assert.equal(out.find((n) => n.placeId === "h")?.visible, true);
}

console.log("test-p6-p7-catalog-demote: ok");
