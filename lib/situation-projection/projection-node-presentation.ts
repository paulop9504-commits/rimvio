import { resolveProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";
import type {
  GhostProjectionNode,
  HubRunnablePill,
  ProjectionNode,
} from "@/lib/situation-projection/types";

export type ProjectionNodeIconToken =
  | "brain"
  | "plane"
  | "bed"
  | "utensils"
  | "sparkles"
  | "info"
  | "ticket"
  | "train"
  | "users"
  | "folder"
  | "wallet"
  | "message";

export type ProjectionDiscoveryAccent = "green" | "blue" | "orange" | "purple";

export type ProjectionPresentationKey =
  | "root"
  | "flight"
  | "lodging"
  | "eatery"
  | "activity"
  | "info"
  | "ticket"
  | "transit"
  | "people"
  | "records"
  | "cost"
  | "thread"
  | "generic";

export type ProjectionNodePresentation = {
  key: ProjectionPresentationKey;
  iconToken: ProjectionNodeIconToken;
  categoryLabelKo: string;
  axisLabelKo: string;
  markerBadgeLabelKo: string;
  discoveryAccent: ProjectionDiscoveryAccent;
};

type ProjectionPresentationSource = Partial<
  Pick<
  HubRunnablePill,
  | "hubServiceId"
  | "ghostAxisId"
  | "semanticType"
  | "semanticTypeLabelKo"
  | "relationLabelKo"
  | "searchQuery"
  | "labelKo"
  | "shortLabelKo"
  >
> & {
  kind?: "solid" | "ghost";
  axisId?: GhostProjectionNode["axisId"];
  label?: string;
  ontologyRole?: ReturnType<typeof resolveProjectionNodeSemantic>["ontologyRole"];
};

const PRESENTATION_BY_KEY: Record<
  ProjectionPresentationKey,
  Omit<ProjectionNodePresentation, "categoryLabelKo" | "axisLabelKo">
> = {
  root: {
    key: "root",
    iconToken: "brain",
    markerBadgeLabelKo: "메인 노드",
    discoveryAccent: "blue",
  },
  flight: {
    key: "flight",
    iconToken: "plane",
    markerBadgeLabelKo: "항공 노드",
    discoveryAccent: "blue",
  },
  lodging: {
    key: "lodging",
    iconToken: "bed",
    markerBadgeLabelKo: "숙소 노드",
    discoveryAccent: "blue",
  },
  eatery: {
    key: "eatery",
    iconToken: "utensils",
    markerBadgeLabelKo: "맛집 노드",
    discoveryAccent: "orange",
  },
  activity: {
    key: "activity",
    iconToken: "sparkles",
    markerBadgeLabelKo: "플레이 노드",
    discoveryAccent: "purple",
  },
  info: {
    key: "info",
    iconToken: "info",
    markerBadgeLabelKo: "정보 노드",
    discoveryAccent: "green",
  },
  ticket: {
    key: "ticket",
    iconToken: "ticket",
    markerBadgeLabelKo: "티켓 노드",
    discoveryAccent: "purple",
  },
  transit: {
    key: "transit",
    iconToken: "train",
    markerBadgeLabelKo: "교통 노드",
    discoveryAccent: "green",
  },
  people: {
    key: "people",
    iconToken: "users",
    markerBadgeLabelKo: "사람 노드",
    discoveryAccent: "green",
  },
  records: {
    key: "records",
    iconToken: "folder",
    markerBadgeLabelKo: "기록 노드",
    discoveryAccent: "purple",
  },
  cost: {
    key: "cost",
    iconToken: "wallet",
    markerBadgeLabelKo: "비용 노드",
    discoveryAccent: "orange",
  },
  thread: {
    key: "thread",
    iconToken: "message",
    markerBadgeLabelKo: "대화 노드",
    discoveryAccent: "green",
  },
  generic: {
    key: "generic",
    iconToken: "info",
    markerBadgeLabelKo: "연결 노드",
    discoveryAccent: "green",
  },
};

function readTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isTicketLike(source: ProjectionPresentationSource): boolean {
  const blob = [
    source.semanticTypeLabelKo,
    source.relationLabelKo,
    source.label,
    source.labelKo,
    source.shortLabelKo,
  ]
    .filter(Boolean)
    .join(" ");
  return source.hubServiceId === "ticket" || /티켓|QR|입장|탑승권|boarding/i.test(blob);
}

function isTransitLike(source: ProjectionPresentationSource): boolean {
  const blob = [
    source.semanticTypeLabelKo,
    source.relationLabelKo,
    source.label,
    source.labelKo,
    source.shortLabelKo,
    source.searchQuery,
  ]
    .filter(Boolean)
    .join(" ");
  return /교통|패스|환승|이동|transit|rail|train/i.test(blob);
}

function resolvePresentationKey(
  source: ProjectionPresentationSource,
): ProjectionPresentationKey {
  if (source.ontologyRole === "root") {
    return "root";
  }
  if (isTicketLike(source)) {
    return "ticket";
  }
  if (source.axisId === "flight" || source.ghostAxisId === "flight") {
    return "flight";
  }
  if (source.axisId === "lodging" || source.ghostAxisId === "lodging") {
    return "lodging";
  }
  if (source.axisId === "eatery" || source.ghostAxisId === "eatery") {
    return "eatery";
  }
  if (source.axisId === "place" || source.ghostAxisId === "place") {
    return "activity";
  }
  if (source.axisId === "people" || source.ghostAxisId === "people") {
    return "people";
  }
  if (
    source.axisId === "records" ||
    source.axisId === "capture" ||
    source.ghostAxisId === "records" ||
    source.ghostAxisId === "capture"
  ) {
    return "records";
  }
  if (source.axisId === "cost" || source.ghostAxisId === "cost") {
    return "cost";
  }
  if (source.axisId === "thread" || source.ghostAxisId === "thread") {
    return "thread";
  }
  if (source.axisId === "info" || source.ghostAxisId === "info") {
    return isTransitLike(source) ? "transit" : "info";
  }
  switch (source.semanticType) {
    case "flight":
      return "flight";
    case "lodging":
      return "lodging";
    case "eatery":
      return "eatery";
    case "place":
      return "activity";
    case "people":
      return "people";
    case "records":
    case "capture":
      return "records";
    case "cost":
      return "cost";
    case "thread":
      return "thread";
    case "info":
      return isTransitLike(source) ? "transit" : "info";
    default:
      return "generic";
  }
}

function resolveCategoryLabel(
  key: ProjectionPresentationKey,
  source: ProjectionPresentationSource,
): string {
  const explicit = readTrimmed(source.semanticTypeLabelKo);
  if (explicit) {
    return explicit;
  }
  switch (key) {
    case "root":
      return "주맥락";
    case "flight":
      return "항공";
    case "lodging":
      return "숙소";
    case "eatery":
      return "맛집";
    case "activity":
      return "플레이";
    case "ticket":
      return "티켓";
    case "transit":
      return "교통";
    case "people":
      return "사람";
    case "records":
      return "기록";
    case "cost":
      return "비용";
    case "thread":
      return "대화";
    case "info":
      return "정보";
    default:
      return "연결";
  }
}

function resolveAxisLabel(
  key: ProjectionPresentationKey,
  source: ProjectionPresentationSource,
): string {
  const explicit = readTrimmed(source.relationLabelKo);
  if (explicit) {
    return explicit;
  }
  switch (key) {
    case "root":
      return "메인 맥락";
    case "flight":
      return "출발 축";
    case "lodging":
      return "머무는 축";
    case "eatery":
      return "식사 동선";
    case "activity":
      return "갈 곳 축";
    case "ticket":
      return "입장 준비";
    case "transit":
      return "이동 정보";
    case "people":
      return "관계 축";
    case "records":
      return "남긴 흔적";
    case "cost":
      return "정산 축";
    case "thread":
      return "이어진 대화";
    case "info":
      return "현지 정보";
    default:
      return "이어진 정보";
  }
}

export function resolveProjectionNodePresentation(
  node: ProjectionNode,
): ProjectionNodePresentation {
  const semantic = resolveProjectionNodeSemantic(node);
  const source: ProjectionPresentationSource = {
    kind: node.kind,
    axisId: node.kind === "ghost" ? node.axisId : undefined,
    semanticType: node.semanticType,
    semanticTypeLabelKo: node.semanticTypeLabelKo ?? null,
    relationLabelKo: node.relationLabelKo ?? null,
    searchQuery: node.kind === "ghost" ? node.searchQuery ?? null : null,
    hubServiceId: node.kind === "ghost" ? node.hubServiceId ?? null : null,
    label: node.label,
    ontologyRole: semantic.ontologyRole,
  };
  const key = resolvePresentationKey(source);
  const preset = PRESENTATION_BY_KEY[key];
  const categoryLabel = resolveCategoryLabel(key, source);
  const axisLabel = resolveAxisLabel(key, source);
  return {
    ...preset,
    categoryLabelKo:
      node.kind === "ghost" && node.candidateOrigin === "media_inferred"
        ? `${categoryLabel} 후보`
        : categoryLabel,
    axisLabelKo:
      node.kind === "ghost" && node.candidateOrigin === "media_inferred"
        ? node.candidateBadgeKo?.trim() || axisLabel
        : axisLabel,
  };
}

export function resolveProjectionPillPresentation(
  pill: HubRunnablePill,
): ProjectionNodePresentation {
  const source: ProjectionPresentationSource = {
    kind: pill.kind,
    ghostAxisId: pill.ghostAxisId ?? undefined,
    semanticType: pill.semanticType ?? undefined,
    semanticTypeLabelKo: pill.semanticTypeLabelKo ?? null,
    relationLabelKo: pill.relationLabelKo ?? null,
    searchQuery: pill.searchQuery ?? null,
    hubServiceId: pill.hubServiceId ?? null,
    labelKo: pill.labelKo,
    shortLabelKo: pill.shortLabelKo,
    ontologyRole: pill.kind === "solid" ? "connected" : "projected",
  };
  const key = resolvePresentationKey(source);
  const preset = PRESENTATION_BY_KEY[key];
  return {
    ...preset,
    categoryLabelKo: resolveCategoryLabel(key, source),
    axisLabelKo: resolveAxisLabel(key, source),
  };
}

export function buildProjectionRelationMemo(input: {
  node: ProjectionNode;
  rootLabel: string;
  supportLabel?: string | null;
}): string {
  const presentation = resolveProjectionNodePresentation(input.node);
  const semantic = resolveProjectionNodeSemantic(input.node);
  const rootLabel = readTrimmed(input.rootLabel) ?? "이 맥락";
  const supportLabel = readTrimmed(input.supportLabel);
  const reason =
    readTrimmed(semantic.relationReasonKo) ??
    `${presentation.axisLabelKo}으로 먼저 붙여 둔 ${presentation.categoryLabelKo} 후보예요`;
  const supportSuffix =
    supportLabel && !reason.includes(supportLabel)
      ? supportLabel
      : null;
  return supportSuffix
    ? `${rootLabel}에서는 ${reason} · ${supportSuffix}`
    : `${rootLabel}에서는 ${reason}`;
}
