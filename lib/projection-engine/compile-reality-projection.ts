import { inferProjectionGoal } from "@/lib/projection-engine/infer-project-goal";
import type {
  ProjectionCluster,
  ProjectionOntologyNode,
  ProjectionOntologyRelation,
  ProjectionStage,
  RealityProjection,
  SuggestedProjectionTask,
} from "@/lib/projection-engine/types";
import { PROJECTION_ENGINE_VERSION } from "@/lib/projection-engine/types";

function nodeId(kind: string, label: string): string {
  const slug = label
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `proj-node:${kind}:${slug || "x"}`;
}

function seedOntology(input: {
  kind: RealityProjection["project"]["kind"];
  titleKo: string;
  placeHint: string | null;
  utterance: string;
}): {
  nodes: ProjectionOntologyNode[];
  relations: ProjectionOntologyRelation[];
  clusters: ProjectionCluster[];
  tasks: SuggestedProjectionTask[];
} {
  const nodes: ProjectionOntologyNode[] = [];
  const relations: ProjectionOntologyRelation[] = [];
  const clusters: ProjectionCluster[] = [];
  const tasks: SuggestedProjectionTask[] = [];

  const placeLabel = input.placeHint ?? "장소";
  const placeNode: ProjectionOntologyNode = {
    id: nodeId("Place", placeLabel),
    kind: "Place",
    labelKo: placeLabel,
    confidence: input.placeHint ? 0.9 : 0.45,
  };
  nodes.push(placeNode);

  if (input.kind === "eat") {
    const restaurant: ProjectionOntologyNode = {
      id: nodeId("Restaurant", input.titleKo),
      kind: "Restaurant",
      labelKo: input.titleKo,
      confidence: 0.8,
    };
    nodes.push(restaurant);
    relations.push({
      id: `rel:${restaurant.id}:located_in:${placeNode.id}`,
      kind: "located_in",
      fromNodeId: restaurant.id,
      toNodeId: placeNode.id,
      labelKo: "위치",
    });
    clusters.push({
      id: "cluster:food",
      kind: "food",
      labelKo: "맛집",
      entityIds: [restaurant.id],
    });
    tasks.push(
      {
        id: "task:compare",
        verb: "compare",
        labelKo: "후보 비교",
        targetNodeId: restaurant.id,
      },
      {
        id: "task:navigate",
        verb: "navigate",
        labelKo: "길 안내",
        targetNodeId: restaurant.id,
      },
      {
        id: "task:save",
        verb: "save",
        labelKo: "저장",
        targetNodeId: restaurant.id,
      },
    );
  } else if (input.kind === "travel") {
    const hotel: ProjectionOntologyNode = {
      id: nodeId("Hotel", "숙소"),
      kind: "Hotel",
      labelKo: "숙소",
      confidence: 0.75,
    };
    const schedule: ProjectionOntologyNode = {
      id: nodeId("Schedule", input.titleKo),
      kind: "Schedule",
      labelKo: "일정",
      confidence: 0.7,
    };
    nodes.push(hotel, schedule);
    relations.push(
      {
        id: `rel:${hotel.id}:located_in:${placeNode.id}`,
        kind: "located_in",
        fromNodeId: hotel.id,
        toNodeId: placeNode.id,
      },
      {
        id: `rel:${schedule.id}:part_of:${placeNode.id}`,
        kind: "part_of",
        fromNodeId: schedule.id,
        toNodeId: placeNode.id,
      },
    );
    clusters.push(
      {
        id: "cluster:hotel",
        kind: "hotel",
        labelKo: "숙소",
        entityIds: [hotel.id],
      },
      {
        id: "cluster:food",
        kind: "food",
        labelKo: "맛집",
        entityIds: [],
      },
    );
    tasks.push(
      {
        id: "task:reserve",
        verb: "reserve",
        labelKo: "예약 준비",
        targetNodeId: hotel.id,
      },
      {
        id: "task:compare",
        verb: "compare",
        labelKo: "숙소 비교",
        targetNodeId: hotel.id,
      },
      {
        id: "task:save",
        verb: "save",
        labelKo: "일정 저장",
        targetNodeId: schedule.id,
      },
    );
  } else if (input.kind === "purchase") {
    const product: ProjectionOntologyNode = {
      id: nodeId("Product", input.titleKo),
      kind: "Product",
      labelKo: input.titleKo,
      confidence: 0.78,
    };
    const budget: ProjectionOntologyNode = {
      id: nodeId("Budget", "예산"),
      kind: "Budget",
      labelKo: "예산",
      confidence: 0.55,
    };
    nodes.push(product, budget);
    relations.push({
      id: `rel:${product.id}:needs:${budget.id}`,
      kind: "needs",
      fromNodeId: product.id,
      toNodeId: budget.id,
    });
    clusters.push({
      id: "cluster:shopping",
      kind: "shopping",
      labelKo: "쇼핑",
      entityIds: [product.id],
    });
    tasks.push(
      {
        id: "task:compare",
        verb: "compare",
        labelKo: "제품 비교",
        targetNodeId: product.id,
      },
      {
        id: "task:buy",
        verb: "buy",
        labelKo: "구매 준비",
        targetNodeId: product.id,
      },
      {
        id: "task:bookmark",
        verb: "bookmark",
        labelKo: "북마크",
        targetNodeId: product.id,
      },
    );
  } else {
    const note: ProjectionOntologyNode = {
      id: nodeId("Note", input.titleKo),
      kind: "Note",
      labelKo: input.titleKo,
      confidence: 0.6,
    };
    nodes.push(note);
    relations.push({
      id: `rel:${note.id}:related_to:${placeNode.id}`,
      kind: "related_to",
      fromNodeId: note.id,
      toNodeId: placeNode.id,
    });
    clusters.push({
      id: "cluster:generic",
      kind: "generic",
      labelKo: "맥락",
      entityIds: [note.id],
    });
    tasks.push({
      id: "task:save",
      verb: "save",
      labelKo: "저장",
      targetNodeId: note.id,
    });
  }

  if (/날씨|weather/iu.test(input.utterance)) {
    nodes.push({
      id: nodeId("Weather", placeLabel),
      kind: "Weather",
      labelKo: "날씨",
      confidence: 0.7,
    });
  }

  return { nodes, relations, clusters, tasks };
}

/**
 * Deterministic Reality Projection compile (Steps 1–4, 8 shell).
 * Search / Globe entities / Commit stay empty until downstream engines fill them.
 * Never auto-Commits.
 */
export function compileRealityProjection(input: {
  utterance: string;
  stage?: ProjectionStage;
  destinationLabel?: string | null;
}): RealityProjection {
  const utterance = input.utterance.trim();
  const goal = inferProjectionGoal(
    input.destinationLabel?.trim()
      ? `${utterance} ${input.destinationLabel}`
      : utterance,
  );
  const placeHint = goal.placeHint ?? input.destinationLabel?.trim() ?? null;
  const seeded = seedOntology({
    kind: goal.kind,
    titleKo: goal.titleKo,
    placeHint,
    utterance,
  });

  const projectId = `proj:${goal.kind}:${Date.now().toString(36)}`;

  return {
    version: PROJECTION_ENGINE_VERSION,
    utterance,
    goal: {
      summaryKo: goal.summaryKo,
      kind: goal.kind,
      confidence: goal.confidence,
    },
    project: {
      id: projectId,
      titleKo: goal.titleKo,
      kind: goal.kind,
    },
    ontology: {
      nodes: seeded.nodes,
      relations: seeded.relations,
    },
    projection: {
      entities: [],
    },
    clusters: seeded.clusters,
    suggestedTasks: seeded.tasks,
    commitCandidates: [],
    stage: input.stage ?? "GENERATE_RELATIONS",
  };
}

/** Advance stage cursor — never jumps past WAIT_COMMIT. */
export function advanceProjectionStage(
  projection: RealityProjection,
  next: ProjectionStage,
): RealityProjection {
  return { ...projection, stage: next };
}
