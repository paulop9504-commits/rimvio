import { inferProjectionGoal } from "@/lib/projection-engine/infer-project-goal";
import type {
  ProjectTreeNode,
  ProjectTreeSector,
  RealityPreparePlan,
} from "@/lib/reality-explorer/types";

const SECTOR_META: Readonly<
  Record<ProjectTreeSector, { emoji: string; labelKo: string }>
> = {
  flight: { emoji: "✈", labelKo: "Flight" },
  hotel: { emoji: "🏨", labelKo: "Hotel" },
  food: { emoji: "🍜", labelKo: "Food" },
  transit: { emoji: "🚃", labelKo: "Transit" },
  budget: { emoji: "💰", labelKo: "Budget" },
  schedule: { emoji: "📅", labelKo: "Schedule" },
  spots: { emoji: "📷", labelKo: "Spots" },
  tickets: { emoji: "🎫", labelKo: "Tickets" },
  tasks: { emoji: "✅", labelKo: "Tasks" },
  rental: { emoji: "🚗", labelKo: "Rental" },
};

function sectorNode(
  projectId: string,
  sector: ProjectTreeSector,
  children: readonly ProjectTreeNode[] = [],
): ProjectTreeNode {
  const meta = SECTOR_META[sector];
  return {
    id: `${projectId}:sector:${sector}`,
    kind: "sector",
    sector,
    labelKo: meta.labelKo,
    emoji: meta.emoji,
    children,
    globeProjectable: sector !== "budget" && sector !== "tasks" && sector !== "tickets",
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
  };
}

function entityNode(input: {
  id: string;
  sector: ProjectTreeSector;
  labelKo: string;
  emoji: string;
  lat?: number | null;
  lng?: number | null;
  relationKind?: string | null;
  relatedNodeId?: string | null;
}): ProjectTreeNode {
  return {
    id: input.id,
    kind: "entity",
    sector: input.sector,
    labelKo: input.labelKo,
    emoji: input.emoji,
    children: [],
    globeProjectable: true,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    relationKind: input.relationKind ?? null,
    relatedNodeId: input.relatedNodeId ?? null,
  };
}

/**
 * Build Project Tree from utterance — Cursor File Tree for reality.
 * Does not answer the user; creates structure first.
 */
export function compileProjectTree(input: {
  utterance: string;
  projectId?: string;
  destinationLabelKo?: string | null;
}): ProjectTreeNode {
  const goal = inferProjectionGoal(
    input.destinationLabelKo?.trim()
      ? `${input.utterance} ${input.destinationLabelKo}`
      : input.utterance,
  );
  const place = goal.placeHint ?? input.destinationLabelKo?.trim() ?? null;
  const titleKo =
    goal.kind === "travel" && place
      ? `${place} Trip`
      : goal.titleKo.includes("여행") || goal.kind === "travel"
        ? place
          ? `${place} Trip`
          : "Travel Project"
        : goal.titleKo;
  const projectId =
    input.projectId?.trim() ||
    `proj:${goal.kind}:${place ?? "x"}:${Date.now().toString(36)}`;

  if (goal.kind === "eat") {
    const foodEntity = entityNode({
      id: `${projectId}:food:main`,
      sector: "food",
      labelKo: goal.titleKo,
      emoji: "🍜",
      relationKind: place ? "located_in" : null,
      relatedNodeId: place ? `${projectId}:place` : null,
    });
    return {
      id: projectId,
      kind: "project",
      sector: null,
      labelKo: titleKo,
      emoji: "📁",
      globeProjectable: false,
      lat: null,
      lng: null,
      relationKind: null,
      relatedNodeId: null,
      children: [
        sectorNode(projectId, "food", [foodEntity]),
        sectorNode(projectId, "transit"),
        sectorNode(projectId, "budget"),
        sectorNode(projectId, "tasks", [
          {
            id: `${projectId}:task:compare`,
            kind: "task",
            sector: "tasks",
            labelKo: "후보 비교",
            emoji: "✅",
            children: [],
            globeProjectable: false,
            lat: null,
            lng: null,
            relationKind: null,
            relatedNodeId: foodEntity.id,
          },
        ]),
      ],
    };
  }

  // Travel (and generic travel-like) — Osaka Trip skeleton
  const placeId = `${projectId}:place`;
  const flightId = `${projectId}:flight:main`;
  const hotelId = `${projectId}:hotel:main`;
  const foodId = `${projectId}:food:main`;
  const transitId = `${projectId}:transit:main`;
  const spotId = `${projectId}:spots:main`;
  const destLabel = place ?? "목적지";

  const flight = entityNode({
    id: flightId,
    sector: "flight",
    labelKo: `${destLabel} 항공`,
    emoji: "✈",
    relationKind: "arrives_before",
    relatedNodeId: hotelId,
  });
  const hotel = entityNode({
    id: hotelId,
    sector: "hotel",
    labelKo: `${destLabel} 호텔`,
    emoji: "🏨",
    relationKind: "near",
    relatedNodeId: transitId,
  });
  const food = entityNode({
    id: foodId,
    sector: "food",
    labelKo: `${destLabel} 맛집`,
    emoji: "🍣",
    relationKind: "requires",
    relatedNodeId: `${projectId}:task:reserve-food`,
  });
  const transit = entityNode({
    id: transitId,
    sector: "transit",
    labelKo: "역 · 이동",
    emoji: "🚃",
  });
  const spot = entityNode({
    id: spotId,
    sector: "spots",
    labelKo: `${destLabel} 명소`,
    emoji: "📍",
  });

  return {
    id: projectId,
    kind: "project",
    sector: null,
    labelKo: titleKo.endsWith("Trip") ? titleKo : `${titleKo}`,
    emoji: "📁",
    globeProjectable: false,
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
    children: [
      sectorNode(projectId, "flight", [flight]),
      sectorNode(projectId, "hotel", [hotel]),
      sectorNode(projectId, "food", [food]),
      sectorNode(projectId, "transit", [transit]),
      sectorNode(projectId, "rental"),
      sectorNode(projectId, "budget"),
      sectorNode(projectId, "schedule"),
      sectorNode(projectId, "spots", [spot]),
      sectorNode(projectId, "tickets"),
      sectorNode(projectId, "tasks", [
        {
          id: `${projectId}:task:reserve-food`,
          kind: "task",
          sector: "tasks",
          labelKo: "맛집 예약",
          emoji: "✅",
          children: [],
          globeProjectable: false,
          lat: null,
          lng: null,
          relationKind: "requires",
          relatedNodeId: `${projectId}:task:pay`,
        },
        {
          id: `${projectId}:task:pay`,
          kind: "task",
          sector: "tasks",
          labelKo: "결제",
          emoji: "✅",
          children: [],
          globeProjectable: false,
          lat: null,
          lng: null,
          relationKind: null,
          relatedNodeId: null,
        },
      ]),
    ],
  };
}

/** Flatten entities that can appear on Globe. */
export function listGlobeProjectableNodes(
  root: ProjectTreeNode,
): readonly ProjectTreeNode[] {
  const out: ProjectTreeNode[] = [];
  const walk = (node: ProjectTreeNode) => {
    if (node.globeProjectable && node.kind === "entity") {
      out.push(node);
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return out;
}

/** Cursor-style prepare plan shown before Projection. */
export function buildRealityPreparePlan(input: {
  projectTitleKo: string;
  kind?: "travel" | "eat" | "generic";
}): RealityPreparePlan {
  const kind = input.kind ?? "travel";
  if (kind === "eat") {
    return {
      version: 1,
      introKo: "I'll prepare:",
      steps: [
        { id: "food", labelKo: "맛집 후보 탐색", done: true },
        { id: "rank", labelKo: "거리·평점 정렬", done: true },
        { id: "hours", labelKo: "영업·예약 가능 여부 확인", done: true },
      ],
      projectingKo: "Projection 중…",
    };
  }
  return {
    version: 1,
    introKo: "I'll prepare:",
    steps: [
      { id: "hotel", labelKo: "호텔 후보 5개", done: true },
      { id: "flight", labelKo: "항공권 비교", done: true },
      { id: "route", labelKo: "동선 최적화", done: true },
      { id: "food", labelKo: "맛집 탐색", done: true },
      { id: "avail", labelKo: "예약 가능 여부 확인", done: true },
    ],
    projectingKo: "Projection 중…",
  };
}
