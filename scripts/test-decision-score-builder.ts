/**
 * Smoke: Decision Score Builder — Node Preview facts → Decision Projection judgment.
 *
 * Wrong:  가격 · 평점 card
 * Right:  total score · judgmentKo · Context weights
 */
import assert from "node:assert/strict";
import { buildNodePreviewsForCompare } from "@/lib/context-workspace/build-node-preview";
import {
  buildDecisionProjectionsForCompare,
  resolveCompareCriteriaWeights,
  TRIP_CONTEXT_COMPARE_WEIGHTS,
} from "@/lib/context-workspace/projection";
import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { CONTEXT_WORKSPACE_VERSION } from "@/lib/context-workspace/types";

function node(
  partial: Partial<ContextWorkspaceNode> &
    Pick<ContextWorkspaceNode, "id" | "kind" | "title" | "lat" | "lng">,
): ContextWorkspaceNode {
  return {
    placeId: partial.placeId ?? partial.id,
    summaryKo: partial.summaryKo ?? "",
    rating: partial.rating ?? null,
    priceBand: partial.priceBand ?? null,
    amountLabel: partial.amountLabel ?? null,
    thumbnailUrl: null,
    tags: partial.tags ?? [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "test",
    ...partial,
  };
}

const usj = node({
  id: "poi_usj",
  kind: "poi",
  title: "USJ",
  lat: 34.6654,
  lng: 135.4323,
  tags: ["usj", "attraction"],
  summaryKo: "유니버설 스튜디오 재팬",
});

const hotelNear = node({
  id: "hotel_a",
  kind: "lodging",
  title: "Hotel A",
  lat: 34.668,
  lng: 135.435,
  amountLabel: "180000원",
  rating: 4.2,
  summaryKo: "USJ 인근",
});

const hotelCheapFar = node({
  id: "hotel_b",
  kind: "lodging",
  title: "Hotel B",
  lat: 34.702,
  lng: 135.495,
  amountLabel: "90000원",
  rating: 4.8,
  summaryKo: "저렴하지만 멀음",
});

const state = {
  version: CONTEXT_WORKSPACE_VERSION,
  workspaceId: "ws_decision",
  contextEventId: "ctx_osaka_trip",
  domain: "lodging",
  status: "editing",
  query: "osaka hotels near usj",
  summaryKo: "Osaka Trip · 3일",
  nodes: [usj, hotelNear, hotelCheapFar],
  relationshipEdges: [
    {
      id: "rel:route:a:usj",
      kind: "route" as const,
      fromId: "hotel_a",
      toId: "poi_usj",
      labelKo: "도보 8분",
      meters: 650,
    },
    {
      id: "rel:compare:a:b",
      kind: "compare" as const,
      fromId: "hotel_a",
      toId: "hotel_b",
      labelKo: "비교",
      meters: null,
    },
  ],
  compilerIr: null,
  realityDraft: {
    draftId: "draft_osaka",
    contextTitleKo: "Osaka Trip",
    destinationKo: "오사카",
    stayLabelKo: "3박",
    status: "prepared" as const,
    days: [
      {
        day: 3,
        labelKo: "3일차",
        emoji: "🎢",
        nodes: [
          {
            nodeId: "poi_usj",
            placeId: "poi_usj",
            title: "USJ",
            entityKind: "attraction" as const,
            lat: usj.lat,
            lng: usj.lng,
            actionReadyState: "discover" as const,
            actions: [],
            emoji: "🎢",
          },
        ],
        lineKo: "USJ",
      },
    ],
    nodeIds: ["poi_usj", "hotel_a", "hotel_b"],
    updatedAtIso: new Date().toISOString(),
  },
  filter: {},
  selectedIds: [],
  compareIds: ["hotel_a", "hotel_b"],
  surfacePrimary: "rich_card" as const,
  openedAtIso: new Date().toISOString(),
  updatedAtIso: new Date().toISOString(),
  committedAtIso: null,
  lastChangeKo: null,
  lastWhy: null,
  history: [],
  future: [],
} satisfies ContextWorkspaceState;

const weights = resolveCompareCriteriaWeights(state);
assert.equal(weights.location, TRIP_CONTEXT_COMPARE_WEIGHTS.location);
assert.equal(weights.scheduleFit, TRIP_CONTEXT_COMPARE_WEIGHTS.scheduleFit);
assert.equal(weights.price, TRIP_CONTEXT_COMPARE_WEIGHTS.price);

const previews = buildNodePreviewsForCompare(state);
assert.equal(previews.length, 2);
assert.ok(
  previews.some((p) => /원|₩|¥|\$|\d/.test(p.price) || p.ratingLabel.length > 0),
  "legacy Preview still exposes price/rating facts",
);

const decisions = buildDecisionProjectionsForCompare(state);
assert.equal(decisions.length, 2);
assert.ok(decisions.every((d) => d.mode === "compare_decision"));
assert.ok(decisions.every((d) => d.actions.includes("select")));
assert.ok(
  decisions.every(
    (d) =>
      d.scores.total >= 0 &&
      d.scores.total <= 100 &&
      typeof d.judgmentKo === "string" &&
      d.judgmentKo.length > 0,
  ),
);

// Decision is not a price/rating card
for (const d of decisions) {
  assert.ok(!/평점|원\s*$|rating/i.test(d.judgmentKo));
  assert.equal(d.weights.location, weights.location);
  assert.deepEqual([...d.actions], ["select"]);
}

const top = decisions[0]!;
const near = decisions.find((d) => d.entityId === "hotel_a")!;
const far = decisions.find((d) => d.entityId === "hotel_b")!;

assert.ok(
  near.scores.location > far.scores.location,
  "Hotel A closer to USJ → higher location score",
);
assert.ok(
  far.scores.price >= near.scores.price,
  "Hotel B cheaper → higher or equal price score",
);
assert.ok(
  near.scores.total >= far.scores.total,
  "Context weights (location+schedule 80%) prefer Hotel A over cheap-far",
);
assert.equal(top.entityId, "hotel_a");
assert.match(near.judgmentKo, /USJ|이동|일정|동선|최소|Context/);

console.log("ok decision-score-builder Preview→Projection", {
  weights,
  hotelA: {
    total: near.scores.total,
    judgmentKo: near.judgmentKo,
    scores: near.scores,
  },
  hotelB: {
    total: far.scores.total,
    judgmentKo: far.judgmentKo,
    scores: far.scores,
  },
});
