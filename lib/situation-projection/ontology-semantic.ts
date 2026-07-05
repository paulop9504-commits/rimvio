import type {
  GhostAxisId,
  ProjectionNode,
  ProjectionOntologyRole,
  ProjectionSemanticType,
  SolidProjectionNode,
} from "@/lib/situation-projection/types";

type ProjectionNodeOntologyMeta = {
  semanticType: ProjectionSemanticType;
  semanticTypeLabelKo: string;
  ontologyRole: ProjectionOntologyRole;
  relationLabelKo: string | null;
  relationReasonKo: string | null;
};

type ProjectionSemanticPreset = Omit<ProjectionNodeOntologyMeta, "ontologyRole" | "relationReasonKo">;

const GHOST_AXIS_META: Record<GhostAxisId, ProjectionSemanticPreset> = {
  schedule: {
    semanticType: "schedule",
    semanticTypeLabelKo: "일정",
    relationLabelKo: "시간 축",
  },
  place: {
    semanticType: "place",
    semanticTypeLabelKo: "장소",
    relationLabelKo: "공간 축",
  },
  flight: {
    semanticType: "flight",
    semanticTypeLabelKo: "항공",
    relationLabelKo: "출발 축",
  },
  lodging: {
    semanticType: "lodging",
    semanticTypeLabelKo: "숙소",
    relationLabelKo: "머무는 축",
  },
  eatery: {
    semanticType: "eatery",
    semanticTypeLabelKo: "맛집",
    relationLabelKo: "식사 동선",
  },
  info: {
    semanticType: "info",
    semanticTypeLabelKo: "정보",
    relationLabelKo: "현지 정보",
  },
  ticket: {
    semanticType: "ticket",
    semanticTypeLabelKo: "티켓",
    relationLabelKo: "입장 준비",
  },
  transit: {
    semanticType: "transit",
    semanticTypeLabelKo: "교통",
    relationLabelKo: "이동 축",
  },
  people: {
    semanticType: "people",
    semanticTypeLabelKo: "사람",
    relationLabelKo: "관계 축",
  },
  records: {
    semanticType: "records",
    semanticTypeLabelKo: "기록",
    relationLabelKo: "남긴 흔적",
  },
  insurance: {
    semanticType: "insurance",
    semanticTypeLabelKo: "서류",
    relationLabelKo: "청구·서류 축",
  },
  cost: {
    semanticType: "cost",
    semanticTypeLabelKo: "비용",
    relationLabelKo: "정산 축",
  },
  thread: {
    semanticType: "thread",
    semanticTypeLabelKo: "대화",
    relationLabelKo: "이어진 대화",
  },
  media: {
    semanticType: "media",
    semanticTypeLabelKo: "순간",
    relationLabelKo: "공유 미디어",
  },
  packing: {
    semanticType: "packing",
    semanticTypeLabelKo: "준비",
    relationLabelKo: "준비 축",
  },
  capture: {
    semanticType: "capture",
    semanticTypeLabelKo: "기록",
    relationLabelKo: "남긴 흔적",
  },
};

const SOLID_ENTITY_META: Record<string, ProjectionSemanticPreset> = {
  experience: {
    semanticType: "experience",
    semanticTypeLabelKo: "주맥락",
    relationLabelKo: "이 순간의 중심",
  },
  place: {
    semanticType: "place",
    semanticTypeLabelKo: "장소",
    relationLabelKo: "이어진 장소",
  },
  person: {
    semanticType: "people",
    semanticTypeLabelKo: "사람",
    relationLabelKo: "함께한 사람",
  },
  people: {
    semanticType: "people",
    semanticTypeLabelKo: "사람",
    relationLabelKo: "함께한 사람",
  },
  thread: {
    semanticType: "thread",
    semanticTypeLabelKo: "대화",
    relationLabelKo: "이어진 대화",
  },
  media: {
    semanticType: "media",
    semanticTypeLabelKo: "순간",
    relationLabelKo: "기억된 순간",
  },
  capture: {
    semanticType: "capture",
    semanticTypeLabelKo: "기록",
    relationLabelKo: "남긴 흔적",
  },
};

function fallbackPreset(): ProjectionSemanticPreset {
  return {
    semanticType: "generic",
    semanticTypeLabelKo: "연결",
    relationLabelKo: "이어진 정보",
  };
}

function solidEntityToken(node: {
  entityId?: string | null;
  eventId?: string | null;
  id?: string | null;
}): string {
  if (node.eventId?.trim()) {
    return "experience";
  }
  if (node.entityId?.trim()) {
    return node.entityId.split(":")[0] ?? "generic";
  }
  if (node.id?.includes(":place:")) {
    return "place";
  }
  if (node.id?.includes(":person:")) {
    return "person";
  }
  return "generic";
}

export function describeSolidProjectionNodeSemantic(
  node: Pick<SolidProjectionNode, "entityId" | "eventId" | "id"> & {
    relationReasonKo?: string | null;
  },
): ProjectionNodeOntologyMeta {
  const token = solidEntityToken(node);
  const preset = SOLID_ENTITY_META[token] ?? fallbackPreset();
  return {
    ...preset,
    ontologyRole: token === "experience" ? "root" : "connected",
    relationReasonKo: node.relationReasonKo ?? null,
  };
}

export function describeGhostProjectionNodeSemantic(input: {
  axisId: GhostAxisId;
  relationReasonKo?: string | null;
}): ProjectionNodeOntologyMeta {
  const preset = GHOST_AXIS_META[input.axisId] ?? fallbackPreset();
  return {
    ...preset,
    ontologyRole: "projected",
    relationReasonKo: input.relationReasonKo ?? null,
  };
}

export function resolveProjectionNodeSemantic(
  node: ProjectionNode,
): ProjectionNodeOntologyMeta {
  const semanticType =
    node.semanticType ??
    (node.kind === "ghost"
      ? describeGhostProjectionNodeSemantic({
          axisId: node.axisId,
          relationReasonKo: node.relationReasonKo ?? node.playbookReasonKo ?? null,
        }).semanticType
      : describeSolidProjectionNodeSemantic(node).semanticType);
  const fallback =
    node.kind === "ghost"
      ? describeGhostProjectionNodeSemantic({
          axisId: node.axisId,
          relationReasonKo: node.relationReasonKo ?? node.playbookReasonKo ?? null,
        })
      : describeSolidProjectionNodeSemantic(node);
  return {
    semanticType,
    semanticTypeLabelKo: node.semanticTypeLabelKo?.trim() || fallback.semanticTypeLabelKo,
    ontologyRole: node.ontologyRole ?? fallback.ontologyRole,
    relationLabelKo: node.relationLabelKo?.trim() || fallback.relationLabelKo,
    relationReasonKo:
      node.relationReasonKo?.trim() ??
      (node.kind === "ghost" ? node.playbookReasonKo?.trim() : null) ??
      fallback.relationReasonKo,
  };
}

export function buildProjectionNodeBadgeLabel(node: ProjectionNode): string {
  const meta = resolveProjectionNodeSemantic(node);
  if (meta.ontologyRole === "root") {
    return meta.semanticTypeLabelKo;
  }
  return meta.semanticTypeLabelKo;
}
