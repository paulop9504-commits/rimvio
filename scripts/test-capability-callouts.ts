/**
 * Smoke: capability callouts stay ≤4; insight has evidence + confidence; live pulse grounded.
 */
import assert from "node:assert/strict";
import {
  buildWorkspaceCapabilityBundle,
  scoreInsightConfidence,
} from "@/lib/context-workspace/capability-callout/build-capability-callouts";
import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";

const preview: NodePreviewModel = {
  nodeId: "n1",
  kind: "lodging",
  title: "APA Hotel",
  kindLabelKo: "숙소",
  heroImage: null,
  galleryImages: [],
  imageCountHint: 0,
  rating: 9.4,
  ratingLabel: "★ 9.4",
  price: "272,350원",
  reviewSummary: "후기 120",
  whyChosen: "역 4분 · 가성비 · 혼자 여행",
  amenities: ["예약 가능", "숙소 · 동선 중심"],
  nearby: [
    { kind: "amenity", labelKo: "🏪 편의점 120m", meters: 120, nodeId: "n2" },
    { kind: "eatery", labelKo: "🍣 맛집 거리 3분", meters: 240, nodeId: "n3" },
  ],
  selected: false,
  bookmarked: false,
  inCompare: false,
  canPrepare: true,
  capabilities: ["book_room"],
};

const bundle = buildWorkspaceCapabilityBundle({
  preview,
  brief: {
    placeId: "p1",
    kind: "lodging",
    title: "APA Hotel",
    routeFitKo: "일정 동선에 잘 맞아요",
    introKo: null,
    featuresKo: ["역 4분", "가격 안정", "혼자 여행 적합"],
    reviewSummaryKo: null,
    atmosphereKo: null,
    knowBefore: [],
    source: "facts",
  },
  draftDayLabelKo: "Day 2",
  recipe: "travel",
});

const { callouts, liveSignals } = bundle;
assert.ok(callouts.length <= 4, "max 4");
assert.equal(callouts[0]?.kind, "insight");
const insight = callouts[0]!;
assert.ok(insight.confidence != null && insight.confidence >= 0.8);
assert.ok(insight.evidence?.every((e) => e.present));
assert.ok(liveSignals.length >= 3);
assert.ok(liveSignals.some((s) => s.id === "price"));
assert.equal(
  scoreInsightConfidence(insight.evidence ?? [], 3) ,
  insight.confidence,
);
assert.equal(callouts[0]?.primaryAction, "rerank_similar");
const nearby = callouts.find((c) => c.kind === "nearby");
assert.ok(nearby?.nearbyTargets?.length);
assert.ok(callouts.some((c) => c.kind === "action"));
console.log(
  "ok capability-callouts",
  callouts.map((c) => c.kind).join(","),
  "live",
  liveSignals.map((s) => s.id).join(","),
  `conf=${Math.round((insight.confidence ?? 0) * 100)}%`,
);
