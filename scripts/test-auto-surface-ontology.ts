#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { listEventCandidates, resetEventCandidatesForTests } from "../lib/events/event-store";
import { writeMediaGuideSnapshot, resetMediaGuideStoreForTests } from "../lib/ontology/media-guide-store";
import type { MediaGuideNode } from "../lib/ontology/media-guide-types";
import { asRimvioEntityId } from "../lib/ontology/entity-types";
import {
  filterBrainSurfaceCandidatesForFocus,
  prioritizeBrainSurfaceCandidatesForFocus,
} from "../lib/situation-projection/brain-surface-focus";
import { buildOntologySurfaceKnowledge } from "../lib/situation-projection/build-ontology-surface-knowledge";
import { projectBrainSurfaceBatch } from "../lib/situation-projection/project-brain-surface-batch";
import type { SituationProjectionManifest } from "../lib/situation-projection/types";

resetEventCandidatesForTests([]);
resetMediaGuideStoreForTests();

const beforeWrites = listEventCandidates().length;

const event: EventCandidate = {
  id: "ev-auto-ontology",
  title: "오사카 12월 여행",
  category: "travel",
  source: "message",
  lifecycle: "active",
  datetime: "2026-12-12T10:00:00.000Z",
  place: "오사카",
  confidence: 0.95,
  metadata: {},
  lifecycleUpdatedAt: "2026-07-04T00:00:00.000Z",
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

const guide: MediaGuideNode = {
  guideNodeId: "guide:osaka-transit",
  title: "오사카 교통 팁 영상",
  sourceKind: "youtube",
  sourceLabelKo: "영상",
  trustLevel: "guide",
  trustLabelKo: "가이드",
  canonicalUrl: "https://www.youtube.com/watch?v=osaka123",
  openUrl: "https://www.youtube.com/watch?v=osaka123",
  embedUrl: "https://www.youtube.com/embed/osaka123",
  thumbnailUrl: "https://i.ytimg.com/vi/osaka123/hqdefault.jpg",
  description: "오사카 교통 카드와 환승 팁",
  providerName: "Osaka Guide",
  domain: "youtube.com",
  durationSeconds: 460,
  youtubeOfficial: null,
  moments: [],
  primaryMoment: null,
  relatedExperienceEntityId: asRimvioEntityId("experience", event.id),
  relatedPlaceEntityId: null,
  relatedPlaceLabel: "오사카",
  relatedCaptureId: "cap-osaka",
  whyRelevantKo: "교통 카드와 환승 흐름을 바로 이해하기 좋아요",
  relevanceScore: 0.93,
  inferredPlaceCandidates: [
    {
      candidateId: "info-transit",
      label: "오사카 교통카드",
      semanticType: "info",
      semanticTypeLabelKo: "정보",
      source: "description",
      sourceLabelKo: "설명",
      snippetKo: "오사카 교통 카드와 환승 팁",
      whyCandidateKo: "이동 흐름을 먼저 맞추기 좋은 정보예요",
      areaLabel: "오사카",
      cuisineHint: null,
      situationalHintsKo: ["이동 준비"],
      confidence: 0.91,
      searchProfile: {
        query: "오사카 교통 카드",
        areaLabel: "오사카",
        countryBias: "jp",
        providerBias: "global",
        searchLocale: "ko-KR",
        anchorLabel: "오사카",
        anchorLat: 34.6937,
        anchorLng: 135.5023,
      },
      lat: null,
      lng: null,
      mapPlacement: "root_branch",
    },
  ],
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

writeMediaGuideSnapshot({
  version: 1,
  guides: [guide],
  updatedAt: "2026-07-04T00:00:00.000Z",
});

const manifest: SituationProjectionManifest = {
  version: 2,
  manifestId: "sp-auto-1",
  situationType: "travel",
  anchorEventId: event.id,
  trigger: { source: "manual", atIso: "2026-07-04T00:00:00.000Z" },
  surfaceKind: "mind_map",
  nodes: [
    {
      kind: "solid",
      id: `solid:${event.id}`,
      eventId: event.id,
      label: event.title,
      evidenceEventIds: [event.id],
      semanticType: "experience",
      semanticTypeLabelKo: "주맥락",
      ontologyRole: "root",
    },
    {
      kind: "ghost",
      id: "ghost:lodging:stay",
      axisId: "lodging",
      label: "난바 스테이",
      virtual: true,
      inferred: true,
      lat: 34.667,
      lng: 135.501,
      surfacePlacement: "map_anchor",
      semanticType: "lodging",
      semanticTypeLabelKo: "숙소",
      ontologyRole: "projected",
      relationReasonKo: "늦게 들어와도 이동 부담이 적어요",
    },
    {
      kind: "ghost",
      id: "ghost:eatery:late",
      axisId: "eatery",
      label: "난바 야식 골목",
      virtual: true,
      inferred: true,
      lat: 34.668,
      lng: 135.503,
      surfacePlacement: "map_anchor",
      semanticType: "eatery",
      semanticTypeLabelKo: "맛집",
      ontologyRole: "projected",
      relationReasonKo: "늦게 한 끼 이어가기 좋아요",
    },
    {
      kind: "ghost",
      id: "ghost:info:transit",
      axisId: "info",
      label: "교통 패스",
      virtual: true,
      inferred: true,
      semanticType: "info",
      semanticTypeLabelKo: "정보",
      ontologyRole: "projected",
      relationReasonKo: "대중교통 리듬이라 먼저 보는 편이 좋아요",
      searchQuery: "오사카 교통 패스",
      href: "/search?q=%EC%98%A4%EC%82%AC%EC%B9%B4%20%EA%B5%90%ED%86%B5%20%ED%8C%A8%EC%8A%A4",
      internalRoute: true,
      actionKind: "hub_service",
      hubServiceId: "ai_search",
      surfacePlacement: "root_branch",
    },
  ],
  links: [],
  pills: [],
  composedAt: "2026-07-04T00:00:00.000Z",
  readOnly: true,
  layoutSource: "deterministic",
  travelBrain: {
    state: {
      destinationLabel: "오사카",
      nights: 2,
      startIso: event.datetime ?? null,
      overseas: true,
      slots: {
        trip_style: { id: "trip_style", value: "balanced", source: "inferred", confidence: 0.8, reasonKo: "" },
        budget_band: { id: "budget_band", value: "balanced", source: "inferred", confidence: 0.8, reasonKo: "" },
        lodging_priority: { id: "lodging_priority", value: "station", source: "inferred", confidence: 0.8, reasonKo: "" },
        food_bias: { id: "food_bias", value: "late_night", source: "inferred", confidence: 0.8, reasonKo: "" },
        mobility_style: { id: "mobility_style", value: "transit", source: "inferred", confidence: 0.8, reasonKo: "" },
        arrival_energy: { id: "arrival_energy", value: "fresh", source: "inferred", confidence: 0.8, reasonKo: "" },
        departure_pressure: { id: "departure_pressure", value: "low", source: "inferred", confidence: 0.8, reasonKo: "" },
        weather_sensitivity: { id: "weather_sensitivity", value: "medium", source: "inferred", confidence: 0.8, reasonKo: "" },
        companion_mode: { id: "companion_mode", value: "friends", source: "inferred", confidence: 0.8, reasonKo: "" },
        sleep_window: { id: "sleep_window", value: "night", source: "inferred", confidence: 0.8, reasonKo: "" },
        activity_density: { id: "activity_density", value: "balanced", source: "inferred", confidence: 0.8, reasonKo: "" },
        shopping_intent: { id: "shopping_intent", value: "low", source: "inferred", confidence: 0.8, reasonKo: "" },
        content_intent: { id: "content_intent", value: "photo", source: "inferred", confidence: 0.8, reasonKo: "" },
        airport_transfer_risk: { id: "airport_transfer_risk", value: "medium", source: "inferred", confidence: 0.8, reasonKo: "" },
        must_keep_reservation: { id: "must_keep_reservation", value: "partial", source: "inferred", confidence: 0.8, reasonKo: "" },
        meal_timing_pattern: { id: "meal_timing_pattern", value: "late_night", source: "inferred", confidence: 0.8, reasonKo: "" },
        info_need_bias: { id: "info_need_bias", value: "transit_pass", source: "inferred", confidence: 0.8, reasonKo: "" },
        decision_confidence: { id: "decision_confidence", value: "exploring", source: "inferred", confidence: 0.8, reasonKo: "" },
      },
    },
    questions: [],
    ui: {
      stage: "ready",
      statusKo: "준비됨",
      questionStep: 0,
      questionTotal: 0,
      focusAxisId: "info",
    },
  } as SituationProjectionManifest["travelBrain"],
};

const knowledge = buildOntologySurfaceKnowledge({
  event,
  manifest,
  guides: [guide],
  now: new Date("2026-12-01T00:00:00.000Z"),
});

assert.ok(
  knowledge.some((candidate) => candidate.label.includes("겨울 일루미네이션")),
  "December travel should include time-fit winter event knowledge",
);
assert.ok(
  !knowledge.some((candidate) => candidate.label.includes("벚꽃")),
  "December travel must not leak spring event knowledge",
);
assert.ok(
  !knowledge.some((candidate) => candidate.label.includes("초여름 비")),
  "December travel must not leak rainy-season event knowledge",
);

const batch = projectBrainSurfaceBatch({
  event,
  manifest,
  guides: [guide],
});

assert.ok(batch, "auto ontology batch should exist");
const infoCandidate = batch?.candidates.find((candidate) => candidate.family === "info") ?? null;
assert.ok(infoCandidate, "info family should project to surface");
assert.ok(
  Number.isFinite(infoCandidate?.lat ?? Number.NaN) &&
    Number.isFinite(infoCandidate?.lng ?? Number.NaN),
  "info candidate without original map coords should still receive spread coordinates",
);
assert.ok(
  batch?.candidates.some((candidate) => candidate.family === "event"),
  "curated seasonal event knowledge should join the surface batch",
);

const focused = filterBrainSurfaceCandidatesForFocus({
  candidates: batch?.candidates ?? [],
  focusedFamily: "lodging",
});
assert.ok(
  focused.some((candidate) => candidate.family === "lodging"),
  "lodging focus should keep lodging nodes",
);
assert.ok(
  focused.some((candidate) => candidate.family === "info"),
  "lodging focus should keep supporting info nodes",
);
assert.ok(
  focused.some((candidate) => candidate.family === "event"),
  "lodging focus should keep supporting event nodes",
);
assert.ok(
  !focused.some((candidate) => candidate.family === "eatery"),
  "lodging focus should drop unrelated eatery nodes by default",
);

const activeLodging =
  batch?.candidates.find((candidate) => candidate.family === "lodging") ?? null;
assert.ok(activeLodging, "lodging family should exist for focus-priority checks");

const prioritized = prioritizeBrainSurfaceCandidatesForFocus({
  candidates: batch?.candidates ?? [],
  focusedFamily: "lodging",
  activeCandidateId: activeLodging?.id ?? null,
  gravityMode: "focused",
});
assert.equal(
  prioritized[0]?.id,
  activeLodging?.id,
  "active lodging node should come to the visual front of the focused family",
);
assert.ok(
  (prioritized[0]?.markerScale ?? 0) > 1,
  "active focused node should scale up visually",
);
const prioritizedSupport =
  prioritized.find((candidate) => candidate.family === "info" && candidate.id !== activeLodging?.id) ??
  null;
assert.ok(prioritizedSupport, "supporting info node should stay visible in focused mode");
assert.ok(
  (prioritizedSupport?.focusPriority ?? 0) < (prioritized[0]?.focusPriority ?? 0),
  "support nodes should sit below the active family node in priority",
);
const originalLodging =
  batch?.candidates.find((candidate) => candidate.id === activeLodging?.id) ?? null;
const originalSupport =
  batch?.candidates.find((candidate) => candidate.id === prioritizedSupport?.id) ?? null;
assert.ok(originalLodging && originalSupport && prioritizedSupport, "support distance fixtures must exist");
const originalDistance =
  Math.abs(originalSupport.lat - originalLodging.lat) +
  Math.abs(originalSupport.lng - originalLodging.lng);
const focusedDistance =
  Math.abs(prioritizedSupport.lat - prioritized[0]!.lat) +
  Math.abs(prioritizedSupport.lng - prioritized[0]!.lng);
assert.ok(
  focusedDistance < originalDistance,
  "support nodes should move closer to the active family center in focused mode",
);

const pinnedGravity = prioritizeBrainSurfaceCandidatesForFocus({
  candidates: batch?.candidates ?? [],
  focusedFamily: "lodging",
  activeCandidateId: null,
  gravityMode: "pinned",
});
assert.ok(
  pinnedGravity.some((candidate) => candidate.family === "eatery"),
  "pinned gravity should keep other families visible instead of hard-filtering them out",
);
const pinnedLead = pinnedGravity[0] ?? null;
assert.ok(
  pinnedLead?.family === "lodging" || pinnedLead?.family === "info" || pinnedLead?.family === "event",
  "pinned gravity should visually bias toward lodging-centered supports",
);
const pinnedAmbientEatery =
  pinnedGravity.find((candidate) => candidate.family === "eatery") ?? null;
assert.ok(
  (pinnedAmbientEatery?.markerOpacity ?? 0) > 0.7,
  "pinned gravity should keep ambient families visible while lowering emphasis",
);

assert.equal(
  listEventCandidates().length,
  beforeWrites,
  "ontology auto-surface builders must stay projection-only",
);

console.log("test-auto-surface-ontology: ok");
