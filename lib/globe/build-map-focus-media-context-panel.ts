import { pickPrimaryReason } from "@/lib/globe/brain-surface-card-copy";
import { resolveBrainSurfaceClosureLine } from "@/lib/globe/resolve-brain-surface-closure-line";
import type { MediaGuideMoment, MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type {
  BrainSurfaceCandidateFamily,
  BrainSurfaceProjectionCandidate,
} from "@/lib/situation-projection/brain-surface-types";
import { copy } from "@/lib/copy/human-ko";

export type MapFocusMediaPanelMoment = {
  timeLabel: string;
  label: string;
  seconds: number | null;
};

export type MapFocusMediaPanelConnectionBucket = {
  family: BrainSurfaceCandidateFamily;
  label: string;
  count: number;
};

export type MapFocusMediaPanelActionKind =
  | "expand_map"
  | "play_moment"
  | "open_detail"
  | "open_bridge";

export type MapFocusMediaPanelAction = {
  kind: MapFocusMediaPanelActionKind;
  label: string;
  candidateCount?: number;
};

export type MapFocusMediaContextPanelContent = {
  whyHereLine: string;
  sceneMoments: readonly MapFocusMediaPanelMoment[];
  sceneFootnote: string | null;
  trustLine: string | null;
  connectionBuckets: readonly MapFocusMediaPanelConnectionBucket[];
  connectionSummaryLine: string | null;
  primaryAction: MapFocusMediaPanelAction | null;
  secondaryAction: MapFocusMediaPanelAction | null;
};

const FAMILY_ORDER: readonly BrainSurfaceCandidateFamily[] = [
  "eatery",
  "lodging",
  "trace_place",
  "media",
  "info",
  "event",
  "memo",
];

function familyBucketLabel(family: BrainSurfaceCandidateFamily): string {
  switch (family) {
    case "eatery":
      return "맛집";
    case "lodging":
      return "숙소";
    case "trace_place":
      return "장소";
    case "media":
      return "영상";
    case "info":
      return "정보";
    case "event":
      return "행사";
    case "memo":
    default:
      return "메모";
  }
}

function toMomentChip(moment: MediaGuideMoment): MapFocusMediaPanelMoment {
  return {
    timeLabel: moment.timeLabel,
    label: moment.chipLabelKo,
    seconds: moment.seconds,
  };
}

function resolveWhyHereLine(input: {
  anchor?: BrainSurfaceProjectionCandidate | null;
  mediaGuide?: MediaGuideNode | null;
  contextPlaceLabel?: string | null;
  recallCaption?: string | null;
}): string {
  const guide = input.mediaGuide;
  const anchor = input.anchor;
  const guideTitle = guide?.title?.trim() || anchor?.label?.trim() || null;

  const fromGuide = guide?.whyRelevantKo?.trim() || null;
  if (fromGuide) {
    return fromGuide;
  }

  if (anchor) {
    const closure = resolveBrainSurfaceClosureLine(anchor);
    if (closure) {
      return closure;
    }
    const reason = pickPrimaryReason({
      headline: anchor.label,
      guideTitle,
      whyRelevantKo: null,
      relationReasonKo: anchor.relationMemoKo,
      playbookReasonKo: null,
      snippetKo: anchor.previewBody,
      memoBody: null,
    });
    if (reason) {
      return reason;
    }
  }

  const recall = input.recallCaption?.trim();
  if (recall) {
    return recall;
  }

  const place = input.contextPlaceLabel?.trim();
  if (place) {
    return copy.globe.mapFocusMediaWhyHerePlaceFallback(place);
  }

  return copy.globe.mapFocusMediaWhyHereDefault;
}

function resolveSceneFootnote(input: {
  mediaGuide?: MediaGuideNode | null;
  anchorLabel?: string | null;
  whyHereLine: string;
}): string | null {
  const title = input.mediaGuide?.title?.trim() || input.anchorLabel?.trim() || null;
  if (!title) {
    return null;
  }
  if (title === input.whyHereLine || input.whyHereLine.includes(title)) {
    return null;
  }
  if (title.length > 56) {
    return `${title.slice(0, 55).trimEnd()}…`;
  }
  return title;
}

function resolveTrustLine(mediaGuide: MediaGuideNode | null | undefined): string | null {
  if (!mediaGuide) {
    return null;
  }
  const parts = [mediaGuide.trustLabelKo, mediaGuide.sourceLabelKo].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function buildConnectionBuckets(
  satellites: readonly BrainSurfaceProjectionCandidate[],
): readonly MapFocusMediaPanelConnectionBucket[] {
  const counts = new Map<BrainSurfaceCandidateFamily, number>();
  for (const row of satellites) {
    counts.set(row.family, (counts.get(row.family) ?? 0) + 1);
  }
  return FAMILY_ORDER.flatMap((family) => {
    const count = counts.get(family) ?? 0;
    if (count <= 0) {
      return [];
    }
    return [{ family, label: familyBucketLabel(family), count }];
  });
}

function formatConnectionSummary(
  buckets: readonly MapFocusMediaPanelConnectionBucket[],
): string | null {
  if (buckets.length === 0) {
    return null;
  }
  return buckets.map((row) => `${row.label} ${row.count}`).join(" · ");
}

function resolveSpatialTraceSummary(
  anchor: BrainSurfaceProjectionCandidate | null | undefined,
  inferredPlaceCount: number,
): string | null {
  const traceCount = anchor?.spatialTraceItems?.length ?? 0;
  if (traceCount > 0) {
    return copy.globe.mapFocusMediaSpatialTraceSummary(traceCount);
  }
  if (inferredPlaceCount > 0) {
    return copy.globe.mapFocusMediaInferredPlacesSummary(inferredPlaceCount);
  }
  return null;
}

function resolveActions(input: {
  canExpandMap: boolean;
  expandCandidateCount?: number;
  primaryMoment: MapFocusMediaPanelMoment | null;
  canOpenDetail: boolean;
  canOpenBridge: boolean;
}): Pick<MapFocusMediaContextPanelContent, "primaryAction" | "secondaryAction"> {
  if (input.canExpandMap) {
    return {
      primaryAction: {
        kind: "expand_map",
        label: copy.globe.contextGuideExpandMap,
        candidateCount: input.expandCandidateCount,
      },
      secondaryAction: input.canOpenDetail
        ? { kind: "open_detail", label: copy.globe.contextGuideDisclosureDetail }
        : input.primaryMoment
          ? {
              kind: "play_moment",
              label: copy.globe.mapFocusMediaPlayMoment(input.primaryMoment.timeLabel),
            }
          : input.canOpenBridge
            ? { kind: "open_bridge", label: copy.globe.mapFocusMediaOpenBridge }
            : null,
    };
  }

  if (input.primaryMoment) {
    return {
      primaryAction: {
        kind: "play_moment",
        label: copy.globe.mapFocusMediaPlayMoment(input.primaryMoment.timeLabel),
      },
      secondaryAction: input.canOpenDetail
        ? { kind: "open_detail", label: copy.globe.contextGuideDisclosureDetail }
        : input.canOpenBridge
          ? { kind: "open_bridge", label: copy.globe.mapFocusMediaOpenBridge }
          : null,
    };
  }

  if (input.canOpenBridge) {
    return {
      primaryAction: { kind: "open_bridge", label: copy.globe.mapFocusMediaOpenBridge },
      secondaryAction: input.canOpenDetail
        ? { kind: "open_detail", label: copy.globe.contextGuideDisclosureDetail }
        : null,
    };
  }

  if (input.canOpenDetail) {
    return {
      primaryAction: { kind: "open_detail", label: copy.globe.contextGuideDisclosureDetail },
      secondaryAction: null,
    };
  }

  return { primaryAction: null, secondaryAction: null };
}

export function buildBrainSurfaceMapFocusPanelContent(input: {
  anchor: BrainSurfaceProjectionCandidate;
  related: readonly BrainSurfaceProjectionCandidate[];
  mediaGuide?: MediaGuideNode | null;
  inferredPlaceCount?: number;
  canExpandMap?: boolean;
  canOpenDetail?: boolean;
}): MapFocusMediaContextPanelContent {
  const satellites = input.related.filter((row) => row.id !== input.anchor.id);
  const whyHereLine = resolveWhyHereLine({
    anchor: input.anchor,
    mediaGuide: input.mediaGuide,
    contextPlaceLabel: input.anchor.placeLabel,
  });
  const guideMoments = input.mediaGuide?.moments ?? [];
  const sceneMoments = guideMoments.slice(0, 3).map(toMomentChip);
  const primaryMoment = sceneMoments[0] ?? null;
  const connectionBuckets = buildConnectionBuckets(satellites);
  const spatialSummary = resolveSpatialTraceSummary(
    input.anchor,
    input.inferredPlaceCount ?? 0,
  );
  const connectionSummaryLine =
    spatialSummary ?? formatConnectionSummary(connectionBuckets);

  const { primaryAction, secondaryAction } = resolveActions({
    canExpandMap: input.canExpandMap === true,
    expandCandidateCount: input.inferredPlaceCount,
    primaryMoment,
    canOpenDetail: input.canOpenDetail === true,
    canOpenBridge: false,
  });

  return {
    whyHereLine,
    sceneMoments,
    sceneFootnote: resolveSceneFootnote({
      mediaGuide: input.mediaGuide,
      anchorLabel: input.anchor.label,
      whyHereLine,
    }),
    trustLine: resolveTrustLine(input.mediaGuide),
    connectionBuckets,
    connectionSummaryLine,
    primaryAction,
    secondaryAction,
  };
}

export function buildPersonalReplayMapFocusPanelContent(input: {
  contextPlaceLabel?: string | null;
  recallCaption?: string | null;
  mediaGuide?: MediaGuideNode | null;
  canExpandMap?: boolean;
  expandCandidateCount?: number;
  canOpenBridge?: boolean;
}): MapFocusMediaContextPanelContent {
  const whyHereLine = resolveWhyHereLine({
    mediaGuide: input.mediaGuide,
    contextPlaceLabel: input.contextPlaceLabel,
    recallCaption: input.recallCaption,
  });
  const guideMoments = input.mediaGuide?.moments ?? [];
  const sceneMoments = guideMoments.slice(0, 3).map(toMomentChip);
  const primaryMoment = sceneMoments[0] ?? null;

  const { primaryAction, secondaryAction } = resolveActions({
    canExpandMap: input.canExpandMap === true,
    expandCandidateCount: input.expandCandidateCount,
    primaryMoment,
    canOpenDetail: false,
    canOpenBridge: input.canOpenBridge === true,
  });

  return {
    whyHereLine,
    sceneMoments,
    sceneFootnote: resolveSceneFootnote({
      mediaGuide: input.mediaGuide,
      whyHereLine,
    }),
    trustLine: resolveTrustLine(input.mediaGuide),
    connectionBuckets: [],
    connectionSummaryLine:
      input.expandCandidateCount && input.expandCandidateCount > 0
        ? copy.globe.mapFocusMediaInferredPlacesSummary(input.expandCandidateCount)
        : null,
    primaryAction,
    secondaryAction,
  };
}

export function resolveSatelliteHint(
  candidate: BrainSurfaceProjectionCandidate,
): string | null {
  const hint =
    candidate.relationMemoKo?.trim() ||
    candidate.inferenceLabelKo?.trim() ||
    candidate.previewBody?.trim() ||
    null;
  if (!hint || hint === candidate.label.trim()) {
    return null;
  }
  if (hint.length > 48) {
    return `${hint.slice(0, 47).trimEnd()}…`;
  }
  return hint;
}
