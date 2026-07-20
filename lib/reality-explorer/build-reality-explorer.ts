import {
  buildRealityPreparePlan,
  compileProjectTree,
  listGlobeProjectableNodes,
} from "@/lib/reality-explorer/compile-project-tree";
import type {
  ProjectDualView,
  ProjectTreeNode,
  RealityExplorerBranch,
  RealityExplorerSnapshot,
} from "@/lib/reality-explorer/types";
import { REALITY_EXPLORER_VERSION } from "@/lib/reality-explorer/types";
import { inferProjectionGoal } from "@/lib/projection-engine/infer-project-goal";
import type { RealityQueueItemV1 } from "@/lib/reality-queue/types";

function cloneAsGlobeView(project: ProjectTreeNode): ProjectTreeNode {
  const entities = listGlobeProjectableNodes(project);
  const bySector = new Map<string, ProjectTreeNode[]>();
  for (const entity of entities) {
    const sector = entity.sector ?? "spots";
    const list = bySector.get(sector) ?? [];
    list.push({ ...entity, children: [] });
    bySector.set(sector, list);
  }

  const children: ProjectTreeNode[] = [...bySector.entries()].map(
    ([sector, nodes]) => ({
      id: `${project.id}:globe:${sector}`,
      kind: "sector" as const,
      sector: nodes[0]?.sector ?? null,
      labelKo: sectorLabel(sector),
      emoji: nodes[0]?.emoji ?? "📍",
      children: nodes,
      globeProjectable: true,
      lat: null,
      lng: null,
      relationKind: null,
      relatedNodeId: null,
    }),
  );

  return {
    id: `${project.id}:globe`,
    kind: "project",
    sector: null,
    labelKo: "Globe",
    emoji: "🌍",
    children,
    globeProjectable: false,
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
  };
}

function sectorLabel(sector: string): string {
  switch (sector) {
    case "flight":
      return "Flight";
    case "hotel":
      return "Hotel";
    case "food":
      return "Food";
    case "transit":
      return "Transit";
    case "spots":
      return "Spots";
    case "rental":
      return "Rental";
    default:
      return sector;
  }
}

function collectRelations(root: ProjectTreeNode): ProjectDualView["relations"] {
  const relations: {
    id: string;
    kind: string;
    fromNodeId: string;
    toNodeId: string;
    labelKo: string;
  }[] = [];
  const walk = (node: ProjectTreeNode) => {
    if (node.relationKind && node.relatedNodeId) {
      relations.push({
        id: `rel:${node.id}:${node.relationKind}:${node.relatedNodeId}`,
        kind: node.relationKind,
        fromNodeId: node.id,
        toNodeId: node.relatedNodeId,
        labelKo: node.relationKind,
      });
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return relations;
}

function ontologyBranch(project: ProjectTreeNode): ProjectTreeNode {
  return {
    id: `${project.id}:ontology`,
    kind: "project",
    sector: null,
    labelKo: "Ontology",
    emoji: "🧠",
    globeProjectable: false,
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
    children: [
      {
        id: `${project.id}:ontology:entities`,
        kind: "sector",
        sector: null,
        labelKo: "Entities",
        emoji: "◈",
        children: listGlobeProjectableNodes(project).map((n) => ({
          ...n,
          children: [],
        })),
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
      {
        id: `${project.id}:ontology:relations`,
        kind: "sector",
        sector: null,
        labelKo: "Relations",
        emoji: "⟷",
        children: collectRelations(project).map((rel) => ({
          id: rel.id,
          kind: "relation" as const,
          sector: null,
          labelKo: `${rel.kind}`,
          emoji: "→",
          children: [],
          globeProjectable: false,
          lat: null,
          lng: null,
          relationKind: rel.kind,
          relatedNodeId: rel.toNodeId,
        })),
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
      {
        id: `${project.id}:ontology:knowledge`,
        kind: "sector",
        sector: null,
        labelKo: "Knowledge",
        emoji: "📚",
        children: [],
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
    ],
  };
}

function itemSector(item: RealityQueueItemV1): ProjectTreeNode["sector"] {
  switch (item.kind) {
    case "flight":
      return "flight";
    case "lodging":
      return "hotel";
    case "eatery":
      return "food";
    case "rental":
      return "rental";
    case "transit":
      return "transit";
    case "calendar":
    case "itinerary":
      return "schedule";
    case "finance":
      return "budget";
    default:
      return "tasks";
  }
}

function itemEmoji(item: RealityQueueItemV1): string {
  switch (item.status) {
    case "ready":
      return "✓";
    case "needs_review":
      return "!";
    case "running":
      return "…";
    case "blocked":
      return "×";
    default:
      return "·";
  }
}

function executionItemNode(
  projectId: string,
  item: RealityQueueItemV1,
): ProjectTreeNode {
  return {
    id: `${projectId}:execution:item:${item.operationId}`,
    kind: "operation",
    sector: itemSector(item),
    labelKo: item.labelKo,
    emoji: itemEmoji(item),
    children: item.preview.summaryKo
      ? [
          {
            id: `${projectId}:execution:item:${item.operationId}:summary`,
            kind: "task",
            sector: itemSector(item),
            labelKo: item.preview.summaryKo,
            emoji: "↳",
            children: [],
            globeProjectable: false,
            lat: null,
            lng: null,
            relationKind: null,
            relatedNodeId: null,
          },
        ]
      : [],
    globeProjectable: false,
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
  };
}

function executionBranch(
  projectId: string,
  items: readonly RealityQueueItemV1[] = [],
): ProjectTreeNode {
  const operationNodes = items.map((item) => executionItemNode(projectId, item));
  return {
    id: `${projectId}:execution`,
    kind: "project",
    sector: null,
    labelKo: "Execution",
    emoji: "⚙",
    globeProjectable: false,
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
    children: [
      {
        id: `${projectId}:execution:drafts`,
        kind: "draft",
        sector: null,
        labelKo: "Drafts",
        emoji: "📝",
        children: [],
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
      {
        id: `${projectId}:execution:inbox`,
        kind: "inbox",
        sector: null,
        labelKo: "Inbox",
        emoji: "📥",
        children: operationNodes,
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
      {
        id: `${projectId}:execution:commits`,
        kind: "commit",
        sector: null,
        labelKo: "Commits",
        emoji: "✓",
        children: [],
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
    ],
  };
}

function timelineBranch(projectId: string): ProjectTreeNode {
  return {
    id: `${projectId}:timeline`,
    kind: "project",
    sector: null,
    labelKo: "Timeline",
    emoji: "📜",
    children: [],
    globeProjectable: false,
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
  };
}

/**
 * Full Reality Explorer snapshot — Project Tree + dual Ontology/Globe + prepare plan.
 * Natural language → Ontology → Project Tree (not chat reply).
 */
export function buildRealityExplorer(input: {
  utterance: string;
  projectId?: string;
  destinationLabelKo?: string | null;
  executionItems?: readonly RealityQueueItemV1[];
}): RealityExplorerSnapshot {
  const goal = inferProjectionGoal(input.utterance);
  const tree = compileProjectTree(input);
  const globeRoot = cloneAsGlobeView(tree);
  const ontologyRoot = ontologyBranch(tree);
  const dual: ProjectDualView = {
    ontologyRoot,
    globeRoot,
    relations: collectRelations(tree),
  };

  const branches: RealityExplorerBranch[] = [
    {
      root: "globe",
      labelKo: "Globe",
      emoji: "🌍",
      children: globeRoot.children,
    },
    {
      root: "ontology",
      labelKo: "Ontology",
      emoji: "🧠",
      children: ontologyRoot.children,
    },
    {
      root: "execution",
      labelKo: "Execution",
      emoji: "⚙",
      children: executionBranch(tree.id, input.executionItems).children,
    },
    {
      root: "timeline",
      labelKo: "Timeline",
      emoji: "📜",
      children: timelineBranch(tree.id).children,
    },
  ];

  const prepareKind =
    goal.kind === "eat" ? "eat" : goal.kind === "travel" ? "travel" : "generic";

  return {
    version: REALITY_EXPLORER_VERSION,
    projectId: tree.id,
    projectTitleKo: tree.labelKo,
    utterance: input.utterance.trim(),
    tree,
    dual,
    branches,
    preparePlan: buildRealityPreparePlan({
      projectTitleKo: tree.labelKo,
      kind: prepareKind,
    }),
  };
}
