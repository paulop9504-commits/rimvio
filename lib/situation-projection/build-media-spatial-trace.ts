import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveBrainSurfaceMarkerMediaKind, resolveBrainSurfaceMarkerThumbnail } from "@/lib/globe/brain-surface-marker-media";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type {
  BrainSurfaceCandidateFamily,
  BrainSurfaceProjectionCandidate,
} from "@/lib/situation-projection/brain-surface-types";
import type {
  SpatialTraceItem,
  SpatialTraceKind,
} from "@/lib/situation-projection/spatial-trace-types";

const LATE_SIGNAL = /late[\s-]?night|after dark|night|야식|심야|밤거리|늦은|야경|밤/u;
const FOOD_SIGNAL =
  /ramen|sushi|udon|soba|izakaya|라멘|스시|초밥|우동|소바|이자카야|맛집|식당|야식/u;
const WALK_SIGNAL = /walk|walking|stroll|산책|도보|걸어서/u;
const PHOTO_SIGNAL =
  /viewpoint|photo spot|photo point|전망|포토|촬영|야경|night view/u;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatConfidenceLabel(confidence: number): string {
  return `${Math.round(clamp(confidence, 0, 1) * 100)}%`;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function estimateWalkMinutes(distanceKm: number): number {
  return Math.max(3, Math.round((distanceKm / 4.8) * 60));
}

function traceIcon(kind: SpatialTraceKind): string {
  switch (kind) {
    case "place":
      return "📍";
    case "time":
      return "🌙";
    case "food":
      return "🍜";
    case "movement":
      return "🚶";
    case "photo":
      return "📷";
    case "mood":
    default:
      return "✨";
  }
}

function collectGuideTextBlob(guide: MediaGuideNode): string {
  return [
    guide.title,
    guide.description,
    ...guide.moments.map((moment) => `${moment.title ?? ""} ${moment.chipLabelKo}`),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function buildTimeTraceItem(guide: MediaGuideNode): SpatialTraceItem | null {
  const blob = collectGuideTextBlob(guide);
  if (!LATE_SIGNAL.test(blob)) {
    return null;
  }
  return {
    id: `trace:${guide.guideNodeId}:time:night`,
    kind: "time",
    labelKo: "밤 촬영",
    detailKo: "영상 흐름상 밤·야경 장면이 이어져요",
    confidence: 0.78,
    confidenceLabelKo: "78%",
    inferenceLabelKo: "영상 단서",
    lat: null,
    lng: null,
    mapsUrl: null,
  };
}

function buildFoodTraceItem(guide: MediaGuideNode): SpatialTraceItem | null {
  const blob = collectGuideTextBlob(guide);
  if (!FOOD_SIGNAL.test(blob)) {
    return null;
  }
  const cuisine =
    guide.inferredPlaceCandidates.find((candidate) => candidate.semanticType === "eatery")
      ?.cuisineHint ??
    (/(ramen|라멘)/iu.test(blob)
      ? "라멘"
      : /(sushi|스시|초밥)/iu.test(blob)
        ? "스시"
        : "맛집");
  return {
    id: `trace:${guide.guideNodeId}:food`,
    kind: "food",
    labelKo: `${cuisine} 거리`,
    detailKo: "영상·설명에서 식사 흐름이 보여요",
    confidence: 0.72,
    confidenceLabelKo: "72%",
    inferenceLabelKo: "영상 단서",
    lat: null,
    lng: null,
    mapsUrl: null,
  };
}

function buildPhotoTraceItem(guide: MediaGuideNode): SpatialTraceItem | null {
  const blob = collectGuideTextBlob(guide);
  if (!PHOTO_SIGNAL.test(blob)) {
    return null;
  }
  return {
    id: `trace:${guide.guideNodeId}:photo`,
    kind: "photo",
    labelKo: "사진 촬영 포인트",
    detailKo: "영상에서 전망·촬영 장면이 확인돼요",
    confidence: 0.7,
    confidenceLabelKo: "70%",
    inferenceLabelKo: "영상 단서",
    lat: null,
    lng: null,
    mapsUrl: null,
  };
}

function buildMovementTraceItem(guide: MediaGuideNode): SpatialTraceItem | null {
  const anchored = guide.inferredPlaceCandidates.filter(
    (candidate) =>
      typeof candidate.lat === "number" &&
      Number.isFinite(candidate.lat) &&
      typeof candidate.lng === "number" &&
      Number.isFinite(candidate.lng),
  );
  if (anchored.length >= 2) {
    const distanceKm = haversineKm(
      { lat: anchored[0]!.lat!, lng: anchored[0]!.lng! },
      { lat: anchored[1]!.lat!, lng: anchored[1]!.lng! },
    );
    const minutes = estimateWalkMinutes(distanceKm);
    const confidence = clamp(0.55 + distanceKm * 0.08, 0.55, 0.88);
    return {
      id: `trace:${guide.guideNodeId}:movement`,
      kind: "movement",
      labelKo: `도보 이동 약 ${minutes}분`,
      detailKo: "영상에서 확인된 후보 공간 사이 거리예요",
      confidence,
      confidenceLabelKo: formatConfidenceLabel(confidence),
      inferenceLabelKo: "추정 동선",
      lat: null,
      lng: null,
      mapsUrl: null,
    };
  }
  const blob = collectGuideTextBlob(guide);
  if (!WALK_SIGNAL.test(blob)) {
    return null;
  }
  return {
    id: `trace:${guide.guideNodeId}:movement:hint`,
    kind: "movement",
    labelKo: "도보 이동 흐름",
    detailKo: "영상 설명에 걷는 동선 단서가 있어요",
    confidence: 0.62,
    confidenceLabelKo: "62%",
    inferenceLabelKo: "추정 동선",
    lat: null,
    lng: null,
    mapsUrl: null,
  };
}

function buildPlaceTraceItems(guide: MediaGuideNode): SpatialTraceItem[] {
  return guide.inferredPlaceCandidates.slice(0, 5).map((candidate) => ({
    id: `trace:${guide.guideNodeId}:place:${candidate.candidateId}`,
    kind: "place" as const,
    labelKo: candidate.label,
    detailKo: candidate.whyCandidateKo,
    confidence: candidate.confidence,
    confidenceLabelKo: formatConfidenceLabel(candidate.confidence),
    inferenceLabelKo: "AI 추정",
    lat: candidate.lat,
    lng: candidate.lng,
    mapsUrl: null,
  }));
}

export function buildMediaSpatialTraceItems(
  guide: MediaGuideNode,
): SpatialTraceItem[] {
  const items: SpatialTraceItem[] = [];
  const seen = new Set<string>();
  const push = (item: SpatialTraceItem | null) => {
    if (!item || seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    items.push(item);
  };

  for (const place of buildPlaceTraceItems(guide)) {
    push(place);
  }
  push(buildTimeTraceItem(guide));
  push(buildFoodTraceItem(guide));
  push(buildMovementTraceItem(guide));
  push(buildPhotoTraceItem(guide));
  return items;
}

function familyForInferredPlace(
  semanticType: MediaGuideNode["inferredPlaceCandidates"][number]["semanticType"],
): BrainSurfaceCandidateFamily {
  switch (semanticType) {
    case "eatery":
      return "eatery";
    case "lodging":
      return "lodging";
    case "info":
      return "info";
    default:
      return "trace_place";
  }
}

function buildOrbitCoords(input: {
  anchorLat: number;
  anchorLng: number;
  index: number;
  radiusKm: number;
}): { lat: number; lng: number } {
  const angle = 300 + input.index * 22;
  const rad = (angle * Math.PI) / 180;
  const latOffset = (input.radiusKm / 111) * Math.cos(rad);
  const lngScale = Math.max(0.25, Math.cos((input.anchorLat * Math.PI) / 180));
  const lngOffset = (input.radiusKm / (111 * lngScale)) * Math.sin(rad);
  return {
    lat: input.anchorLat + latOffset,
    lng: input.anchorLng + lngOffset,
  };
}

export function buildMediaSpatialTraceCandidates(input: {
  event: EventCandidate;
  guides: readonly MediaGuideNode[];
  anchorLat: number;
  anchorLng: number;
  startRevealOrder: number;
}): BrainSurfaceProjectionCandidate[] {
  const candidates: BrainSurfaceProjectionCandidate[] = [];
  let revealOrder = input.startRevealOrder;

  for (const [guideIndex, guide] of input.guides.entries()) {
    const clusterId = `media:${guide.guideNodeId}`;
    const traceItems = buildMediaSpatialTraceItems(guide);
    const videoCoords = buildOrbitCoords({
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
      index: guideIndex,
      radiusKm: 0.42,
    });

    candidates.push({
      id: `brain-surface:${input.event.id}:video:${guide.guideNodeId}`,
      eventId: input.event.id,
      nodeId: `ghost:media:${guide.guideNodeId}:root`,
      family: "media",
      clusterId,
      parentGuideNodeId: guide.guideNodeId,
      anchorKind: "video_root",
      markerStyle: "solid",
      confidence: guide.relevanceScore,
      confidenceLabelKo: formatConfidenceLabel(guide.relevanceScore),
      inferenceLabelKo: null,
      spatialTraceItems: traceItems,
      focusAffinityFamilies: ["media", "trace_place", "eatery", "lodging", "info", "event"],
      label: normalizeText(guide.title) || "영상",
      previewTitle: normalizeText(guide.title) || "영상",
      previewBody:
        normalizeText(guide.whyRelevantKo) ||
        "영상 기반으로 연결된 후보 공간이에요",
      placeLabel: normalizeText(guide.relatedPlaceLabel) || "영상",
      lat: videoCoords.lat,
      lng: videoCoords.lng,
      accent: "purple",
      badgeLabelKo: "영상",
      relationMemoKo: normalizeText(guide.whyRelevantKo) || null,
      sourceLabelKo: `${guide.sourceLabelKo} · ${guide.trustLabelKo}`,
      validityLabelKo: null,
      evidenceKind: "video",
      primaryActionLabelKo: "바로 보기",
      openUrl: guide.openUrl,
      embedUrl: guide.embedUrl,
      mapsUrl: null,
      searchQuery: null,
      sourceGuideNodeId: guide.guideNodeId,
      revealOrder,
      markerThumbnailUrl: resolveBrainSurfaceMarkerThumbnail({
        family: "media",
        thumbnailUrl: guide.thumbnailUrl,
      }),
      markerMediaKind: resolveBrainSurfaceMarkerMediaKind({
        family: "media",
        embedUrl: guide.embedUrl,
      }),
      virtualCandidate: true,
      memoCommitDraft: null,
    });
    revealOrder += 1;

    for (const [placeIndex, place] of guide.inferredPlaceCandidates
      .slice(0, 4)
      .entries()) {
      const family = familyForInferredPlace(place.semanticType);
      const coords =
        typeof place.lat === "number" &&
        Number.isFinite(place.lat) &&
        typeof place.lng === "number" &&
        Number.isFinite(place.lng)
          ? { lat: place.lat, lng: place.lng }
          : buildOrbitCoords({
              anchorLat: videoCoords.lat,
              anchorLng: videoCoords.lng,
              index: placeIndex + 1,
              radiusKm: 0.28 + placeIndex * 0.08,
            });

      candidates.push({
        id: `brain-surface:${input.event.id}:inferred:${guide.guideNodeId}:${place.candidateId}`,
        eventId: input.event.id,
        nodeId: `ghost:media:${guide.guideNodeId}:${place.candidateId}`,
        family,
        clusterId,
        parentGuideNodeId: guide.guideNodeId,
        anchorKind: "inferred_place",
        markerStyle: "dashed",
        confidence: place.confidence,
        confidenceLabelKo: formatConfidenceLabel(place.confidence),
        inferenceLabelKo: "AI 추정",
        spatialTraceItems: undefined,
        focusAffinityFamilies: ["media", family, "info", "event"],
        label: place.label,
        previewTitle: place.label,
        previewBody: place.whyCandidateKo,
        placeLabel: place.label,
        lat: coords.lat,
        lng: coords.lng,
        accent:
          family === "eatery"
            ? "orange"
            : family === "lodging"
              ? "blue"
              : "green",
        badgeLabelKo: `AI 추정 ${formatConfidenceLabel(place.confidence)}`,
        relationMemoKo: `${guide.title} · ${place.whyCandidateKo}`,
        sourceLabelKo: `${place.sourceLabelKo} · ${guide.sourceLabelKo}`,
        validityLabelKo: "영상에서 확인된 후보",
        evidenceKind: "video",
        primaryActionLabelKo: "후보 보기",
        openUrl: guide.openUrl,
        embedUrl: null,
        mapsUrl: null,
        searchQuery: place.searchProfile.query,
        sourceGuideNodeId: guide.guideNodeId,
        revealOrder,
        virtualCandidate: true,
        memoCommitDraft: null,
      });
      revealOrder += 1;
    }
  }

  return candidates;
}

export function formatSpatialTraceLine(item: SpatialTraceItem): string {
  const prefix = traceIcon(item.kind);
  if (item.confidenceLabelKo && item.inferenceLabelKo) {
    return `${prefix} ${item.labelKo} (${item.inferenceLabelKo} ${item.confidenceLabelKo})`;
  }
  return `${prefix} ${item.labelKo}`;
}
