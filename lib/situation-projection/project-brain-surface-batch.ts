import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveStableContextPlaceAnchor } from "@/lib/context-instance/build-context-instance";
import {
  filterVisibleBrainSurfaceCandidates,
  resolveBrainSurfaceMarkerMediaKind,
} from "@/lib/globe/brain-surface-marker-media";
import { resolveContextPlaceLabel } from "@/lib/globe/context-hub/resolve-context-place-label";
import {
  buildAreaCuriosityHook,
  buildAreaCuriosityPreview,
} from "@/lib/globe/infer-area-curiosity-hook";
import { buildMediaSpatialTraceCandidates } from "@/lib/situation-projection/build-media-spatial-trace";
import { buildOntologySurfaceKnowledge } from "@/lib/situation-projection/build-ontology-surface-knowledge";
import { queryMediaGuideByGuideNodeId } from "@/lib/ontology/media-guide-store";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import { resolveProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type {
  BrainSurfaceProjectionBatch,
  BrainSurfaceCandidateFamily,
  BrainSurfaceProjectionCandidate,
  BrainSurfaceMemoCommitDraft,
} from "@/lib/situation-projection/brain-surface-types";
import type {
  GhostProjectionNode,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function isGhostNode(node: unknown): node is GhostProjectionNode {
  return (
    !!node &&
    typeof node === "object" &&
    (node as GhostProjectionNode).kind === "ghost"
  );
}

function buildNodeFamily(
  node: GhostProjectionNode,
): BrainSurfaceProjectionCandidate["family"] | null {
  if (node.candidateOrigin === "media_inferred" && node.sourceGuideNodeId?.trim()) {
    if (node.semanticType === "eatery") {
      return "eatery";
    }
    if (node.semanticType === "lodging") {
      return "lodging";
    }
    if (node.semanticType === "info") {
      return "info";
    }
    return "trace_place";
  }
  if (node.axisId === "eatery") {
    return "eatery";
  }
  if (node.axisId === "lodging") {
    return "lodging";
  }
  if (node.axisId === "info" || node.axisId === "ticket") {
    return "info";
  }
  return null;
}

function defaultFocusAffinity(
  family: BrainSurfaceCandidateFamily,
): readonly BrainSurfaceCandidateFamily[] {
  switch (family) {
    case "lodging":
      return ["lodging", "info", "event", "memo"];
    case "eatery":
      return ["eatery", "info", "event", "memo"];
    case "media":
      return ["media", "trace_place", "info", "event", "memo"];
    case "trace_place":
      return ["trace_place", "media", "info", "event", "memo"];
    case "event":
      return ["event", "info", "memo"];
    case "info":
      return ["info", "event", "memo"];
    case "memo":
    default:
      return ["memo", "info", "event"];
  }
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function buildOrbitCoords(input: {
  anchorLat: number;
  anchorLng: number;
  family: BrainSurfaceCandidateFamily;
  familyIndex: number;
}): { lat: number; lng: number } {
  const baseAngleByFamily: Record<BrainSurfaceCandidateFamily, number> = {
    media: 320,
    trace_place: 340,
    lodging: 20,
    eatery: 120,
    info: 215,
    event: 265,
    memo: 0,
  };
  const baseRadiusKmByFamily: Record<BrainSurfaceCandidateFamily, number> = {
    media: 0.65,
    trace_place: 0.78,
    lodging: 0.9,
    eatery: 1.05,
    info: 0.72,
    event: 0.86,
    memo: 0.58,
  };
  const familyLoop = Math.floor(input.familyIndex / 5);
  const angle = baseAngleByFamily[input.family] + (input.familyIndex % 5) * 16;
  const radiusKm = baseRadiusKmByFamily[input.family] + familyLoop * 0.18;
  const rad = toRadians(angle);
  const latOffset = (radiusKm / 111) * Math.cos(rad);
  const lngScale = Math.max(0.25, Math.cos(toRadians(input.anchorLat)));
  const lngOffset = (radiusKm / (111 * lngScale)) * Math.sin(rad);
  return {
    lat: input.anchorLat + latOffset,
    lng: input.anchorLng + lngOffset,
  };
}

function pickNodeCoords(input: {
  node: GhostProjectionNode;
  anchorLat: number;
  anchorLng: number;
  family: BrainSurfaceCandidateFamily;
  familyIndex: number;
}): { lat: number; lng: number } {
  if (
    typeof input.node.lat === "number" &&
    Number.isFinite(input.node.lat) &&
    typeof input.node.lng === "number" &&
    Number.isFinite(input.node.lng) &&
    input.node.surfacePlacement === "map_anchor"
  ) {
    return {
      lat: input.node.lat,
      lng: input.node.lng,
    };
  }
  return buildOrbitCoords({
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    family: input.family,
    familyIndex: input.familyIndex,
  });
}

function buildNodeBody(
  event: EventCandidate,
  node: GhostProjectionNode,
): string | null {
  return (
    normalizeText(node.sourceGuideSnippetKo) ||
    normalizeText(node.relationReasonKo) ||
    normalizeText(node.playbookReasonKo) ||
    normalizeText(event.place) ||
    null
  );
}

function isInventoryBackedResourceNode(node: GhostProjectionNode): boolean {
  return Boolean(
    node.placeId?.trim() &&
      node.lat != null &&
      node.lng != null &&
      Number.isFinite(node.lat) &&
      Number.isFinite(node.lng),
  );
}

function buildMicroResourcePreviewBody(node: GhostProjectionNode): string {
  const parts: string[] = [];
  const cuisine = normalizeText(node.cuisineHint);
  if (cuisine) {
    parts.push(cuisine);
  }
  if (node.rating != null && Number.isFinite(node.rating)) {
    parts.push(`★ ${node.rating.toFixed(1)}`);
  }
  const reason = normalizeText(node.playbookReasonKo);
  if (reason && !parts.includes(reason)) {
    parts.push(reason);
  }
  return parts.join(" · ") || reason || node.label;
}

function buildNodeCandidate(input: {
  event: EventCandidate;
  node: GhostProjectionNode;
  lat: number;
  lng: number;
  revealOrder: number;
}): BrainSurfaceProjectionCandidate | null {
  const family = buildNodeFamily(input.node);
  if (!family) {
    return null;
  }
  const presentation = resolveProjectionNodePresentation(input.node);
  const guide = input.node.sourceGuideNodeId
    ? queryMediaGuideByGuideNodeId(input.node.sourceGuideNodeId)
    : null;
  const areaLabel = resolveContextPlaceLabel(input.event) || input.node.label;
  const previewTitle =
    family === "media"
      ? normalizeText(guide?.title) || normalizeText(input.node.sourceGuideTitle) || input.node.label
      : input.node.label;
  const nodeBody = buildNodeBody(input.event, input.node);
  const microResource =
    isInventoryBackedResourceNode(input.node) &&
    (family === "eatery" || family === "lodging");
  const previewBody = microResource
    ? buildMicroResourcePreviewBody(input.node)
    : family === "media"
      ? normalizeText(guide?.whyRelevantKo) || nodeBody
      : buildAreaCuriosityPreview({
          areaLabel,
          lat: input.lat,
          lng: input.lng,
          family,
          detailLine: nodeBody,
        });
  const openUrl =
    normalizeText(guide?.openUrl) ||
    normalizeText(input.node.sourceGuideUrl) ||
    normalizeText(input.node.href) ||
    null;
  const embedUrl =
    family === "media" || input.node.candidateOrigin === "media_inferred"
      ? normalizeText(guide?.embedUrl) || null
      : null;
  if (family === "media" && !embedUrl) {
    return null;
  }
  const isMediaInferred = input.node.candidateOrigin === "media_inferred";
  const confidence = input.node.candidateConfidence ?? null;
  const rawThumbnail =
    normalizeText(input.node.previewImageUrl) ||
    (family === "media" ? normalizeText(guide?.thumbnailUrl) : null) ||
    null;
  if (
    (family === "lodging" || family === "eatery" || family === "trace_place") &&
    !microResource &&
    !rawThumbnail
  ) {
    return null;
  }
  const markerThumbnailUrl = rawThumbnail;
  const markerMediaKind = resolveBrainSurfaceMarkerMediaKind({ family, embedUrl });

  return {
    id: `brain-surface:${input.event.id}:${input.node.id}`,
    eventId: input.event.id,
    nodeId: input.node.id,
    family,
    clusterId: isMediaInferred
      ? `media:${normalizeText(input.node.sourceGuideNodeId)}`
      : `node:${family}:${input.node.axisId}`,
    parentGuideNodeId: isMediaInferred
      ? normalizeText(input.node.sourceGuideNodeId) || null
      : null,
    anchorKind: isMediaInferred ? "inferred_place" : null,
    markerStyle: isMediaInferred ? "dashed" : "solid",
    confidence,
    confidenceLabelKo:
      confidence != null ? `${Math.round(confidence * 100)}%` : null,
    inferenceLabelKo: isMediaInferred ? "AI 추정" : null,
    spatialTraceItems: undefined,
    focusAffinityFamilies: defaultFocusAffinity(family),
    label: input.node.label,
    previewTitle,
    previewBody,
    placeLabel: areaLabel,
    lat: input.lat,
    lng: input.lng,
    accent: presentation.discoveryAccent,
    badgeLabelKo: isMediaInferred
      ? input.node.candidateBadgeKo ||
        (confidence != null ? `AI 추정 ${Math.round(confidence * 100)}%` : "AI 추정")
      : presentation.markerBadgeLabelKo,
    relationMemoKo: normalizeText(input.node.relationReasonKo) || null,
    sourceLabelKo:
      family === "media" && guide
        ? `${guide.sourceLabelKo} · ${guide.trustLabelKo}`
        : isMediaInferred && guide
          ? `${guide.sourceLabelKo} · ${guide.trustLabelKo}`
          : null,
    validityLabelKo: isMediaInferred ? "영상에서 확인된 후보" : null,
    evidenceKind: isMediaInferred ? "video" : null,
    primaryActionLabelKo:
      family === "media"
        ? "바로 보기"
        : family === "info"
          ? "가이드 열기"
          : "상세 열기",
    openUrl,
    embedUrl,
    mapsUrl: normalizeText(input.node.mapsUrl) || null,
    searchQuery: normalizeText(input.node.searchQuery) || null,
    sourceGuideNodeId: normalizeText(input.node.sourceGuideNodeId) || null,
    revealOrder: input.revealOrder,
    markerThumbnailUrl,
    markerMediaKind,
    virtualCandidate: true,
    memoCommitDraft: null,
  };
}

function buildMemoDraft(input: {
  event: EventCandidate;
  placeLabel: string;
  note: string;
  lat: number;
  lng: number;
}): BrainSurfaceMemoCommitDraft {
  const anchorTitle = normalizeText(input.event.place) || normalizeText(input.event.title) || "맥락";
  return {
    title: `${input.placeLabel} 메모`,
    placeLabel: input.placeLabel,
    note: `${anchorTitle} · ${input.note}`,
    lat: input.lat,
    lng: input.lng,
  };
}

function buildMemoLabel(input: {
  event: EventCandidate;
  node: GhostProjectionNode;
  baseFamily: BrainSurfaceProjectionCandidate["family"];
  lat: number;
  lng: number;
}): string | null {
  const areaLabel =
    resolveContextPlaceLabel(input.event) ||
    normalizeText(input.event.place) ||
    normalizeText(input.node.label) ||
    "이 근처";
  return buildAreaCuriosityHook({
    areaLabel,
    lat: input.lat,
    lng: input.lng,
    family: "memo",
    nodeLabel: input.node.label,
  });
}

function buildMemoCandidate(_input: {
  event: EventCandidate;
  node: GhostProjectionNode;
  baseFamily: BrainSurfaceProjectionCandidate["family"];
  lat: number;
  lng: number;
  revealOrder: number;
}): BrainSurfaceProjectionCandidate | null {
  return null;
}

function candidateSignature(candidate: BrainSurfaceProjectionCandidate): string {
  return [
    candidate.family,
    normalizeText(candidate.label).toLowerCase(),
    normalizeText(candidate.openUrl).toLowerCase(),
    normalizeText(candidate.sourceGuideNodeId).toLowerCase(),
  ].join("|");
}

function placeCandidate(input: {
  candidate: BrainSurfaceProjectionCandidate;
  anchorLat: number;
  anchorLng: number;
  familyCounts: Map<BrainSurfaceCandidateFamily, number>;
}): BrainSurfaceProjectionCandidate {
  if (Number.isFinite(input.candidate.lat) && Number.isFinite(input.candidate.lng)) {
    return input.candidate;
  }
  const familyIndex = input.familyCounts.get(input.candidate.family) ?? 0;
  input.familyCounts.set(input.candidate.family, familyIndex + 1);
  const coords = buildOrbitCoords({
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    family: input.candidate.family,
    familyIndex,
  });
  return {
    ...input.candidate,
    lat: coords.lat,
    lng: coords.lng,
  };
}

export function projectBrainSurfaceBatch(input: {
  event: EventCandidate;
  manifest: SituationProjectionManifest | null;
  guides?: readonly MediaGuideNode[];
}): BrainSurfaceProjectionBatch | null {
  const manifest = input.manifest;
  if (!manifest || manifest.anchorEventId !== input.event.id) {
    return null;
  }

  const anchor = resolveStableContextPlaceAnchor(input.event);
  const sourceNodes = manifest.nodes.filter(isGhostNode);
  const candidates: BrainSurfaceProjectionCandidate[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const familyNodeCounts = new Map<BrainSurfaceCandidateFamily, number>();
  const familyFloatingCounts = new Map<BrainSurfaceCandidateFamily, number>();
  const guideRows = input.guides ?? [];
  const guideIds = new Set<string>(guideRows.map((guide) => guide.guideNodeId));

  const pushCandidate = (candidate: BrainSurfaceProjectionCandidate | null) => {
    if (!candidate) {
      return;
    }
    const placed = placeCandidate({
      candidate,
      anchorLat: anchor.lat,
      anchorLng: anchor.lng,
      familyCounts: familyFloatingCounts,
    });
    const signature = candidateSignature(placed);
    if (seenIds.has(placed.id) || seenKeys.has(signature)) {
      return;
    }
    seenIds.add(placed.id);
    seenKeys.add(signature);
    candidates.push(placed);
  };

  for (const node of sourceNodes) {
    if (
      node.candidateOrigin === "media_inferred" &&
      node.sourceGuideNodeId &&
      guideIds.has(node.sourceGuideNodeId)
    ) {
      continue;
    }
    const family =
      buildNodeFamily(node) ??
      (node.axisId === "eatery"
        ? "eatery"
        : node.axisId === "lodging"
          ? "lodging"
          : node.axisId === "info" || node.axisId === "ticket"
            ? "info"
            : node.candidateOrigin === "media_inferred"
              ? "media"
              : null);
    if (
      family &&
      (family === "eatery" || family === "lodging") &&
      !isInventoryBackedResourceNode(node) &&
      sourceNodes.some(
        (peer) =>
          peer.axisId === node.axisId && isInventoryBackedResourceNode(peer),
      )
    ) {
      continue;
    }
    const familyIndex = family
      ? (familyNodeCounts.get(family) ?? 0)
      : 0;
    if (family) {
      familyNodeCounts.set(family, familyIndex + 1);
    }
    const coords = family
      ? pickNodeCoords({
          node,
          anchorLat: anchor.lat,
          anchorLng: anchor.lng,
          family,
          familyIndex,
        })
      : null;
    const baseCandidate = buildNodeCandidate({
      event: input.event,
      node,
      lat: coords?.lat ?? anchor.lat,
      lng: coords?.lng ?? anchor.lng,
      revealOrder: candidates.length,
    });
    pushCandidate(baseCandidate);

    if (
      (node.axisId === "place" || node.candidateOrigin === "media_inferred") &&
      !isInventoryBackedResourceNode(node)
    ) {
      const memo = buildMemoCandidate({
        event: input.event,
        node,
        baseFamily:
          baseCandidate?.family ??
          (node.axisId === "eatery"
            ? "eatery"
            : node.axisId === "lodging"
              ? "lodging"
              : "media"),
        lat: coords?.lat ?? anchor.lat,
        lng: coords?.lng ?? anchor.lng,
        revealOrder: candidates.length,
      });
      pushCandidate(memo);
    }
  }

  for (const knowledgeCandidate of buildOntologySurfaceKnowledge({
    event: input.event,
    manifest,
    guides: input.guides,
  })) {
    pushCandidate(knowledgeCandidate);
  }

  if (guideRows.length > 0) {
    for (const traceCandidate of buildMediaSpatialTraceCandidates({
      event: input.event,
      guides: guideRows,
      anchorLat: anchor.lat,
      anchorLng: anchor.lng,
      startRevealOrder: candidates.length,
    })) {
      pushCandidate(traceCandidate);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return {
    eventId: input.event.id,
    candidates: filterVisibleBrainSurfaceCandidates(
      candidates.map((candidate, index) => ({
        ...candidate,
        revealOrder: index,
      })),
    ),
    createdAt: new Date().toISOString(),
    trigger: "brain_complete",
  };
}
