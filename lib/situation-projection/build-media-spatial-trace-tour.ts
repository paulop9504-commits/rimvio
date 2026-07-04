import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type { BrainSurfaceProjectionBatch } from "@/lib/situation-projection/brain-surface-types";

export type MediaSpatialTraceTourStopKind = "video" | "place" | "trace";

export type MediaSpatialTraceTourStop = {
  id: string;
  kind: MediaSpatialTraceTourStopKind;
  labelKo: string;
  detailKo: string | null;
  confidenceLabelKo: string | null;
  inferenceLabelKo: string | null;
  lat: number;
  lng: number;
  candidateId: string | null;
};

function hasCoords(lat: number | null | undefined, lng: number | null | undefined): lat is number {
  return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
}

function formatConfidence(confidence: number): string {
  return `${Math.round(Math.min(Math.max(confidence, 0), 1) * 100)}%`;
}

function resolveGuideClusterId(guideNodeId: string | null | undefined): string | null {
  const id = guideNodeId?.trim();
  return id ? `media:${id}` : null;
}

export function buildMediaSpatialTraceTourStopsFromGuide(
  guide: MediaGuideNode,
): MediaSpatialTraceTourStop[] {
  const stops: MediaSpatialTraceTourStop[] = [];
  const inferred = [...guide.inferredPlaceCandidates]
    .filter((candidate) => hasCoords(candidate.lat, candidate.lng))
    .sort((left, right) => right.confidence - left.confidence);

  for (const candidate of inferred) {
    stops.push({
      id: `tour:guide:${guide.guideNodeId}:${candidate.candidateId}`,
      kind: "place",
      labelKo: candidate.label,
      detailKo: candidate.whyCandidateKo?.trim() || candidate.snippetKo?.trim() || null,
      confidenceLabelKo: formatConfidence(candidate.confidence),
      inferenceLabelKo: "AI 추정",
      lat: candidate.lat!,
      lng: candidate.lng!,
      candidateId: null,
    });
  }

  return stops;
}

export function buildMediaSpatialTraceTourStops(input: {
  batch: BrainSurfaceProjectionBatch;
  guideNodeId?: string | null;
}): MediaSpatialTraceTourStop[] {
  const clusterId = resolveGuideClusterId(input.guideNodeId);
  const scoped = clusterId
    ? input.batch.candidates.filter((candidate) => candidate.clusterId === clusterId)
    : input.batch.candidates;

  const videoRoot = scoped.find((candidate) => candidate.anchorKind === "video_root");
  const stops: MediaSpatialTraceTourStop[] = [];

  if (videoRoot && hasCoords(videoRoot.lat, videoRoot.lng)) {
    stops.push({
      id: `tour:${videoRoot.id}`,
      kind: "video",
      labelKo: videoRoot.previewTitle?.trim() || videoRoot.label,
      detailKo:
        videoRoot.previewBody?.trim() ||
        videoRoot.relationMemoKo?.trim() ||
        "영상에서 이어진 후보예요",
      confidenceLabelKo: videoRoot.confidenceLabelKo ?? null,
      inferenceLabelKo: null,
      lat: videoRoot.lat,
      lng: videoRoot.lng,
      candidateId: videoRoot.id,
    });
  }

  const inferred = scoped
    .filter(
      (candidate) =>
        candidate.anchorKind === "inferred_place" &&
        hasCoords(candidate.lat, candidate.lng),
    )
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0));

  for (const candidate of inferred) {
    stops.push({
      id: `tour:${candidate.id}`,
      kind: "place",
      labelKo: candidate.label,
      detailKo:
        candidate.previewBody?.trim() ||
        candidate.relationMemoKo?.trim() ||
        candidate.validityLabelKo?.trim() ||
        null,
      confidenceLabelKo: candidate.confidenceLabelKo ?? null,
      inferenceLabelKo: candidate.inferenceLabelKo ?? "AI 추정",
      lat: candidate.lat,
      lng: candidate.lng,
      candidateId: candidate.id,
    });
  }

  return stops;
}
