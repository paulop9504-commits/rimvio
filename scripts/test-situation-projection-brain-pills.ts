#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { findEventCandidate } from "../lib/events/event-store";
import { resetEntityGraphStoreForTests } from "../lib/ontology";
import {
  commitKnowledgeToProjection,
  composeBrainProjectionManifest,
  openBrainProjectionForEvent,
  patchTravelBrainProjectionAnswer,
} from "../lib/situation-projection/compose-brain-projection";
import {
  recordBrainQuestionFamilyAnswer,
  resetBrainQuestionMemoryForTests,
  resolveBrainQuestionRoute,
} from "../lib/situation-projection";
import { resolveProjectionNodeSemantic } from "../lib/situation-projection/ontology-semantic";
import {
  buildProjectionSurfaceFilterOptions,
  isProjectionNodeVisibleForSurface,
} from "../lib/situation-projection/projection-surface-filter";
import { buildProjectionNodeExplanation } from "../lib/situation-projection/projection-node-explanation";
import { selectProjectionDisplayManifest } from "../lib/situation-projection/projection-display-mode";
import { buildTravelBrainProjection } from "../lib/situation-projection/travel-brain-personalization";
import type { GhostProjectionNode } from "../lib/situation-projection/types";
import { countTravelProjectionGhostsByAxis } from "../lib/situation-projection/travel-brain-projection";
import { confirmKnowledgePlacementCapture } from "../lib/globe/confirm-knowledge-placement-capture";
import {
  insuranceGhostNodeId,
  suggestKnowledgePlacement,
} from "../lib/situation-projection/promote-projection-link";
import { readFeedCaptureFragments } from "../lib/feed/feed-capture-metadata";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
} from "../lib/globe/eatery/eatery-resource-types";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "../lib/globe/context-hub/lodging-resource-types";
import { resolveHubPillTap } from "../lib/situation-projection/resolve-hub-pill-tap";
import {
  readProjectionManifestForAnchor,
  resetProjectionStoreForTests,
} from "../lib/situation-projection/projection-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();
resetProjectionStoreForTests();
resetBrainQuestionMemoryForTests();

const momCare = commitEventUpsert({
  id: "ev-mom-brain",
  title: "어머니 암 치료",
  category: "custom",
  source: "message",
  lifecycle: "completed",
  place: "○○병원",
  metadata: { peerDisplayName: "어머니" },
});

const travel = commitEventUpsert({
  id: "ev-osaka",
  title: "오사카 여행 3박4일 친구 금요일 저녁 출발",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  datetime: "2026-07-10T19:30:00+09:00",
  place: "오사카",
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2026-07-13T11:00:00+09:00",
    contextTicketArtifact: {
      labelKo: "오사카 주유패스",
      actionUrl: "https://ticket.example/osaka-pass",
      placeLabel: "오사카",
    },
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "lodging-1",
        name: "난바 베이스 호텔",
        lat: 34.665,
        lng: 135.502,
        images: [],
        partnerLabel: "난바 중심",
      },
    ],
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "eatery-1",
        name: "난바 로컬 식당",
        lat: 34.667,
        lng: 135.501,
        images: [],
        categoryLabel: "음식점 · 현지식",
        specialReasonKo: "관광 동선 안에서 현지 느낌을 살리기 좋은 후보예요",
        virtualCandidate: true,
      },
    ],
  },
});

const parentsTravel = commitEventUpsert({
  id: "ev-parents-trip",
  title: "부모님과 2박3일 후쿠오카 여행",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  datetime: "2026-09-05T08:30:00+09:00",
  place: "후쿠오카",
  metadata: {
    feedPlanEnabled: true,
  },
});

const photoTravel = commitEventUpsert({
  id: "ev-photo-trip",
  title: "교토 여행",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "교토",
  metadata: {
    feedPlanEnabled: true,
    note: "사진 많이 찍고 싶다",
  },
});

const momManifest = composeBrainProjectionManifest({
  event: momCare,
  trigger: { source: "manual", atIso: new Date().toISOString() },
});

assert.equal(momManifest.surfaceKind, "mind_map");
assert.ok(momManifest.mindMapLayout, "brain manifest includes mind-map layout");
assert.ok(momManifest.mindMapLayout!.nodes.length > 0, "mind-map layout has nodes");
assert.ok(momManifest.pills.length > 0, "caregiving brain has pills");
assert.ok(
  momManifest.nodes.some(
    (n) => n.kind === "ghost" && n.axisId === "insurance" && n.label === "보험서류함",
  ),
  "insurance knowledge box ghost",
);
assert.ok(
  momManifest.links.every((l) => l.virtual ? l.strokeStyle === "dashed" : true),
  "virtual links dashed",
);
assert.ok(
  momManifest.links.some((l) => l.virtual === false && l.relationLabelKo === "이어진 장소"),
  "solid links keep typed ontology relation labels",
);
const focusedMomManifest = selectProjectionDisplayManifest(
  momManifest,
  "brain_focus",
);
assert.ok(
  momManifest.nodes.some(
    (node) =>
      node.kind === "solid" &&
      resolveProjectionNodeSemantic(node).ontologyRole === "connected",
  ),
  "base brain manifest still includes connected context nodes before filtering",
);
assert.ok(
  focusedMomManifest.nodes.some(
    (node) =>
      node.kind === "solid" &&
      resolveProjectionNodeSemantic(node).ontologyRole === "root",
  ),
  "brain focus keeps the root context anchor",
);
assert.ok(
  focusedMomManifest.nodes.every(
    (node) =>
      node.kind === "ghost" ||
      resolveProjectionNodeSemantic(node).ontologyRole === "root",
  ),
  "brain focus removes connected solid context nodes from the visible graph",
);
assert.ok(
  focusedMomManifest.links.every(
    (link) =>
      focusedMomManifest.nodes.some((node) => node.id === link.fromId) &&
      focusedMomManifest.nodes.some((node) => node.id === link.toId),
  ),
  "brain focus also trims links to hidden generic nodes",
);

const insurancePill = momManifest.pills.find((p) => p.ghostAxisId === "insurance");
assert.ok(insurancePill);
assert.equal(insurancePill?.semanticTypeLabelKo, "서류");
assert.equal(insurancePill?.relationLabelKo, "청구·서류 축");
assert.equal(resolveHubPillTap({ pill: insurancePill!, event: momCare }).kind, "knowledge_capture");

const travelManifest = openBrainProjectionForEvent(travel);
assert.ok(travelManifest.travelBrain, "travel brain state is attached to the manifest");
assert.equal(
  travelManifest.travelBrain?.ui.stage,
  "preparing",
  "travel brain starts in a lightweight preparing stage while questions remain",
);
assert.ok(
  (travelManifest.travelBrain?.questions.length ?? 0) <= 3,
  "travel brain limits clarification questions to 3",
);
assert.ok(
  (travelManifest.travelBrain?.ui.questionTotal ?? 0) <= 3,
  "travel brain UI progress also stays capped at 3",
);
assert.ok(
  (travelManifest.travelBrain?.ui.questionStep ?? 0) >= 1,
  "travel brain UI exposes sequential question progress",
);
assert.equal(
  travelManifest.travelBrain?.state.slots.trip_style.value,
  "balanced",
  "friends + 3박4일 defaults to balanced rhythm",
);
assert.equal(
  travelManifest.travelBrain?.state.slots.arrival_energy.value,
  "late_tired",
  "Friday evening departure infers first-day fatigue",
);
assert.equal(
  travelManifest.travelBrain?.state.slots.food_bias.value,
  "late_night",
  "Friday evening travel infers a late-night food bias",
);
assert.equal(
  travelManifest.travelBrain?.state.slots.mobility_style.value,
  "transit",
  "Osaka travel defaults to transit-heavy movement",
);
assert.ok(
  travelManifest.travelBrain?.questions.some((question) => question.slotId === "content_intent"),
  "travel brain can ask a broad intent clarification when purpose is still open",
);
assert.ok(
  travelManifest.travelBrain?.questions.some((question) => question.slotId === "budget_band"),
  "travel brain can ask a practicality clarification when budget fit is still open",
);
assert.equal(resolveBrainQuestionRoute(travel).family, "travel");
const travelGhosts = travelManifest.nodes.filter(
  (node): node is GhostProjectionNode => node.kind === "ghost",
);
const filterOptions = buildProjectionSurfaceFilterOptions(travelManifest.nodes);
assert.ok(
  filterOptions.some((option) => option.key === "lodging") &&
    filterOptions.some((option) => option.key === "eatery") &&
    filterOptions.some((option) => option.key === "activity") &&
    filterOptions.some((option) => option.key === "info"),
  "brain surface exposes lightweight category filters for major resource types",
);
const calmVisibleGhosts = travelGhosts.filter((node) =>
  isProjectionNodeVisibleForSurface({
    node,
    activeFilter: "all",
    allowAuxiliary: true,
  }),
);
assert.ok(
  calmVisibleGhosts.every((node) => node.emphasis === "focus" || node.emphasis === "main"),
  "resting default map stays calm by hiding aux travel nodes",
);
const lodgingFilterGhosts = travelGhosts.filter((node) =>
  isProjectionNodeVisibleForSurface({
    node,
    activeFilter: "lodging",
    allowAuxiliary: true,
  }),
);
assert.ok(
  lodgingFilterGhosts.every((node) => node.axisId === "lodging"),
  "category filter isolates a single axis without cross-axis clutter",
);
const travelGhostCounts = countTravelProjectionGhostsByAxis(travelGhosts);
assert.equal(
  travelGhosts.filter((node) => node.emphasis === "focus").length,
  1,
  "travel brain promotes a single focus item",
);
assert.ok(
  travelGhosts.some((node) => node.emphasis === "main"),
  "travel brain also keeps supporting main items",
);
assert.ok(
  travelGhosts.some((node) => node.emphasis === "aux"),
  "travel brain keeps secondary aux resources behind the main set",
);
for (const axis of ["flight", "lodging", "eatery", "info", "place"]) {
  assert.ok(
    (travelGhostCounts[axis] ?? 0) >= 1,
    `travel brain seeds ${axis}`,
  );
  const limit = axis === "place" ? 2 : 3;
  assert.ok((travelGhostCounts[axis] ?? 0) <= limit, `travel brain caps ${axis} at ${limit}`);
}
assert.ok(travelManifest.pills.length <= 4, "travel card pills stay compact");
assert.ok(
  travelManifest.pills.some(
    (p) =>
      p.hubServiceId === "flight" ||
      p.hubServiceId === "lodging" ||
      p.hubServiceId === "eatery" ||
      p.hubServiceId === "ai_search",
  ),
  "travel pills include travel hubs",
);
const flightNode = travelGhosts.find((n) => n.axisId === "flight");
assert.equal(flightNode?.semanticTypeLabelKo, "항공");
assert.equal(flightNode?.actionKind, "hub_service");
assert.ok(
  flightNode?.href?.startsWith("https://"),
  "flight seed opens a booking handoff",
);
const lodgingNode = travelGhosts.find((n) => n.axisId === "lodging");
assert.equal(lodgingNode?.semanticTypeLabelKo, "숙소");
assert.equal(lodgingNode?.actionKind, "context_run");
assert.match(lodgingNode?.searchQuery ?? "", /숙소/);
assert.equal(lodgingNode?.stayWindow?.checkInIso, "2026-07-10T19:30:00+09:00");
assert.equal(lodgingNode?.stayWindow?.checkOutIso, "2026-07-13T11:00:00+09:00");
assert.equal(
  lodgingNode?.surfacePlacement,
  "map_anchor",
  "lodging inventory candidates stay map-anchorable",
);
assert.ok(
  travelManifest.nodes.some(
    (n) => n.kind === "ghost" && n.axisId === "eatery" && n.label === "난바 로컬 식당",
  ),
  "travel manifest includes eatery ghost candidates",
);
const travelEateryNode = travelManifest.nodes.find(
  (n) => n.kind === "ghost" && n.axisId === "eatery" && n.label === "난바 로컬 식당",
);
assert.equal(travelEateryNode?.semanticTypeLabelKo, "맛집");
assert.equal(travelEateryNode?.relationLabelKo, "식사 동선");
assert.equal(
  travelEateryNode?.surfacePlacement,
  "map_anchor",
  "eatery inventory candidates stay map-anchorable",
);
const travelPlaceNode = travelManifest.nodes.find(
  (n) => n.kind === "ghost" && n.axisId === "place",
);
assert.ok(travelPlaceNode, "travel manifest includes activity/place ghosts");
assert.equal(travelPlaceNode?.semanticTypeLabelKo, "플레이");
assert.equal(travelPlaceNode?.relationLabelKo, "갈 곳 축");
assert.equal(
  travelPlaceNode?.surfacePlacement,
  "map_anchor",
  "place/activity seeds attach to real geography when a destination anchor exists",
);
const eateryPill = travelManifest.pills.find((p) => p.linkedNodeId === "ghost:eatery:eatery-1");
assert.ok(eateryPill);
assert.equal(eateryPill?.semanticTypeLabelKo, "맛집");
assert.equal(eateryPill?.relationLabelKo, "식사 동선");
const eateryTap = resolveHubPillTap({ pill: eateryPill!, event: travel });
assert.equal(eateryTap.kind, "context_run");
if (eateryTap.kind === "context_run") {
  assert.match(eateryTap.searchQuery ?? "", /난바 로컬 식당/);
}
const infoPill = travelManifest.pills.find(
  (pill) => pill.ghostAxisId === "info" || pill.hubServiceId === "ai_search",
);
assert.ok(infoPill, "travel brain keeps an info handoff");
assert.ok(
  travelGhosts.some((node) => node.id === "ghost:info:transit"),
  "initial travel info prioritizes transit help",
);
assert.ok(
  travelGhosts.some(
    (node) => node.axisId === "info" && node.surfacePlacement === "root_branch",
  ),
  "non-placeable info resources stay root-connected instead of faking map pins",
);
const ticketNode = travelGhosts.find((node) => node.axisId === "ticket");
assert.ok(ticketNode, "ticket artifacts surface as ticket nodes when present");
assert.equal(ticketNode?.semanticTypeLabelKo, "티켓");
assert.equal(ticketNode?.relationLabelKo, "입장 준비");
assert.equal(
  ticketNode?.surfacePlacement,
  "root_branch",
  "ticket nodes stay attached to the main context instead of faking map placement",
);
const eateryExplanation = buildProjectionNodeExplanation({
  node: travelEateryNode!,
  manifest: travelManifest,
  event: travel,
});
assert.ok(
  eateryExplanation.factorsKo.length >= 2 && eateryExplanation.factorsKo.length <= 4,
  "selected-node explanations stay concise",
);
assert.ok(
  eateryExplanation.factorsKo.includes("오사카 기준"),
  "selected-node explanations keep the destination anchor visible",
);
assert.ok(
  eateryExplanation.factorsKo.includes("체크인 뒤 바로 한 끼로 편함"),
  "eatery explanations can reflect first-night dinner timing from the lodging basecamp",
);
assert.ok(
  eateryExplanation.factorsKo.includes("숙소 복귀 부담 적음"),
  "eatery explanations surface low return burden to the lodging basecamp",
);
assert.ok(
  eateryExplanation.factorsKo.includes("늦은 식사 중심"),
  "eatery explanations surface the strongest food bias",
);
assert.ok(
  !eateryExplanation.factorsKo.includes("이동 피로 고려"),
  "selected-node explanations avoid turning into a long variable dump",
);
assert.ok(
  lodgingNode,
  "travel manifest includes a lodging node for explanation checks",
);
const lodgingExplanation = buildProjectionNodeExplanation({
  node: lodgingNode!,
  manifest: travelManifest,
  event: travel,
  supportLabel: "난바 중심",
});
assert.ok(
  lodgingExplanation.factorsKo.some((factor) => /7월 10일-13일 · 3박/u.test(factor)),
  "lodging explanations surface the stay window as compact basecamp timing",
);
assert.ok(
  lodgingExplanation.factorsKo.includes("첫날 체크인 부담을 줄이는 축"),
  "lodging explanations can mention arrival-side stay pressure",
);
const infoNode = travelGhosts.find((node) => node.axisId === "info");
const infoExplanation = buildProjectionNodeExplanation({
  node: infoNode!,
  manifest: travelManifest,
  event: travel,
});
assert.ok(
  infoExplanation.factorsKo.includes("체크인·체크아웃 동선 정리에 도움"),
  "info explanations can mention checkout-side time pressure when it matters",
);
assert.ok(
  infoExplanation.factorsKo.includes("대중교통 이동"),
  "info explanations surface the mobility style behind the result",
);
assert.match(
  lodgingExplanation.memoKo,
  /난바 중심/u,
  "memo copy can carry a compact support label without exposing raw debug fields",
);

const contentIntentQuestion = travelManifest.travelBrain?.questions.find(
  (question) => question.slotId === "content_intent",
);
assert.ok(contentIntentQuestion, "content intent question exists");
const photoChoice = contentIntentQuestion?.choices.find((choice) => choice.value === "photo");
assert.ok(photoChoice, "content intent question offers photo answer");
const patchedTravelManifest = patchTravelBrainProjectionAnswer({
  event: travel,
  question: contentIntentQuestion!,
  choice: photoChoice!,
});
assert.ok(patchedTravelManifest, "travel brain patches live after an answer");
assert.equal(
  patchedTravelManifest?.travelBrain?.state.slots.content_intent.value,
  "photo",
  "answered intent choice becomes learned state",
);
assert.equal(
  patchedTravelManifest?.travelBrain?.state.slots.content_intent.source,
  "learned",
  "answered content intent slot is marked learned",
);
assert.ok(
  !(patchedTravelManifest?.travelBrain?.questions ?? []).some(
    (question) => question.slotId === "content_intent",
  ),
  "answered question is removed from the remaining reduced set",
);
const patchedTravelGhosts = patchedTravelManifest?.nodes.filter(
  (node): node is GhostProjectionNode => node.kind === "ghost",
) ?? [];
assert.ok(
  patchedTravelGhosts.some((node) => node.id === "ghost:place:photo-spot"),
  "answer patches visible place resources immediately",
);
assert.ok(
  !patchedTravelGhosts.some((node) => node.id === "ghost:place:signature"),
  "patched projection swaps only the affected place emphasis",
);
assert.equal(
  patchedTravelGhosts.filter((node) => node.emphasis === "focus").length,
  1,
  "patched projection still keeps a single focus item",
);
const patchedGhostCounts = countTravelProjectionGhostsByAxis(patchedTravelGhosts);
for (const axis of ["flight", "lodging", "eatery", "info", "place"]) {
  const limit = axis === "place" ? 2 : 3;
  assert.ok((patchedGhostCounts[axis] ?? 0) <= limit, `patched travel brain still caps ${axis} at ${limit}`);
}

resetBrainQuestionMemoryForTests();

const parentsBrain = buildTravelBrainProjection(parentsTravel);
assert.equal(
  parentsBrain.state.slots.lodging_priority.value,
  "family",
  "parents trip infers convenience-first lodging",
);
assert.equal(
  parentsBrain.state.slots.mobility_style.value,
  "taxi",
  "parents trip infers taxi-friendly mobility",
);
assert.equal(
  parentsBrain.state.slots.activity_density.value,
  "light",
  "parents trip lowers activity density",
);

const photoBrain = buildTravelBrainProjection(photoTravel);
assert.equal(
  photoBrain.state.slots.content_intent.value,
  "photo",
  "photo-heavy request infers photo content intent",
);
assert.equal(
  photoBrain.state.slots.weather_sensitivity.value,
  "high",
  "photo-heavy request increases weather sensitivity",
);

recordBrainQuestionFamilyAnswer({
  family: "travel",
  slotId: "content_intent",
  choice: { id: "photo", labelKo: "사진", value: "photo" },
});

const repeatTravel = commitEventUpsert({
  id: "ev-repeat-trip",
  title: "도쿄 여행",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "도쿄",
  metadata: {
    feedPlanEnabled: true,
  },
});

const repeatedTravelBrain = buildTravelBrainProjection(repeatTravel);
assert.equal(
  repeatedTravelBrain.state.slots.content_intent.value,
  "photo",
  "travel family reuses the previously answered intent when context stays compatible",
);
assert.equal(
  repeatedTravelBrain.state.slots.content_intent.source,
  "learned",
  "reused family answer is marked learned",
);
assert.ok(
  !(repeatedTravelBrain.questions ?? []).some((question) => question.slotId === "content_intent"),
  "reused family answer skips repeated intent questions for travel-to-travel flows",
);

const suggestion = suggestKnowledgePlacement({
  captureFileName: "실비보험청구서.pdf",
  candidateEvents: [momCare, travel, parentsTravel, photoTravel],
});
assert.ok(suggestion);
assert.equal(suggestion!.anchorEventId, "ev-mom-brain");
assert.equal(suggestion!.knowledgeBoxLabel, "보험서류함");

const promoted = commitKnowledgeToProjection({
  anchorEventId: momCare.id,
  ghostNodeId: insuranceGhostNodeId(),
  pillId: insurancePill!.id,
});
assert.ok(promoted);
const stored = readProjectionManifestForAnchor(momCare.id);
assert.ok(stored?.links.some((l) => l.toId === insuranceGhostNodeId() && l.strokeStyle === "solid"));
assert.ok(stored?.pills.find((p) => p.id === insurancePill!.id)?.kind === "solid");

const strayCapture = commitEventUpsert({
  id: "ev-stray-insurance-doc",
  title: "실비보험청구서",
  category: "custom",
  source: "message",
  lifecycle: "completed",
  metadata: {
    feedCaptures: [
      {
        id: "cap-insurance-doc",
        kind: "photo",
        capturedAtIso: new Date().toISOString(),
        label: "실비보험청구서.pdf",
      },
    ],
  },
});

const walkthroughSuggestion = suggestKnowledgePlacement({
  captureFileName: "실비보험청구서.pdf",
  candidateEvents: [momCare, travel, parentsTravel, photoTravel, strayCapture],
});
assert.ok(walkthroughSuggestion);
assert.equal(walkthroughSuggestion!.anchorEventId, "ev-mom-brain");

const confirmResult = confirmKnowledgePlacementCapture({
  suggestion: walkthroughSuggestion!,
  captureEventId: strayCapture.id,
  captureFragmentId: "cap-insurance-doc",
  captureFileName: "실비보험청구서.pdf",
  pillId: insurancePill!.id,
});
assert.equal(confirmResult.ok, true);
if (confirmResult.ok) {
  assert.equal(confirmResult.knowledgeBoxLabel, "보험서류함");
}
const momAfterConfirm = readFeedCaptureFragments(findEventCandidate("ev-mom-brain")!);
assert.ok(
  momAfterConfirm.some((row) => row.id === "cap-insurance-doc"),
  "capture reassigned to caregiving anchor",
);

console.log("test-situation-projection-brain-pills: ok");
