/**
 * Deterministic Context Brief from Workspace graph — no LLM essay.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type {
  ContextBrief,
  ContextBriefRole,
  ContextBriefRoleKind,
} from "@/lib/context-workspace/context-brief/types";
import { buildBriefReplayNodeIds } from "@/lib/context-workspace/context-brief/build-brief-replay-stops";

const MAX_GROUNDS = 4;
const MAX_ROLES = 5;

function visibleNodes(
  state: ContextWorkspaceState,
): readonly ContextWorkspaceNode[] {
  return state.nodes.filter(
    (n) =>
      n.visible &&
      Number.isFinite(n.lat) &&
      Number.isFinite(n.lng),
  );
}

function looksAirport(node: ContextWorkspaceNode): boolean {
  return /공항|airport|kix|간사이\s*국제/iu.test(
    `${node.title} ${node.tags.join(" ")} ${node.placeId}`,
  );
}

function looksExperience(node: ContextWorkspaceNode): boolean {
  if (node.kind !== "poi" && node.kind !== "amenity") return false;
  return /usj|유니버설|테마파|랜드마크|사찰|사원|시장|파크|도톤|교토|temple|park/iu.test(
    `${node.title} ${node.tags.join(" ")}`,
  );
}

function roleKindFor(node: ContextWorkspaceNode): ContextBriefRoleKind {
  if (looksAirport(node)) return "arrival";
  if (node.kind === "lodging") return "stay";
  if (node.kind === "eatery") return "food";
  if (looksExperience(node)) return "experience";
  if (node.kind === "poi" || node.kind === "amenity") return "experience";
  return "other";
}

function roleLabelKo(kind: ContextBriefRoleKind): string {
  switch (kind) {
    case "arrival":
      return "도착";
    case "stay":
      return "숙소";
    case "experience":
      return "체험";
    case "food":
      return "맛집";
    case "route":
      return "동선";
    default:
      return "장소";
  }
}

function pickRoles(
  nodes: readonly ContextWorkspaceNode[],
): ContextBriefRole[] {
  const preferredOrder: ContextBriefRoleKind[] = [
    "arrival",
    "stay",
    "experience",
    "food",
  ];
  const byKind = new Map<ContextBriefRoleKind, ContextWorkspaceNode>();
  for (const node of nodes) {
    const kind = roleKindFor(node);
    if (kind === "other" || kind === "route") continue;
    if (!byKind.has(kind)) byKind.set(kind, node);
  }
  const roles: ContextBriefRole[] = [];
  for (const kind of preferredOrder) {
    const node = byKind.get(kind);
    if (!node) continue;
    roles.push({
      kind,
      labelKo: roleLabelKo(kind),
      placeTitle: node.title,
      nodeId: node.id,
    });
    if (roles.length >= MAX_ROLES) break;
  }
  if (roles.length === 0 && nodes[0]) {
    const node = nodes[0];
    roles.push({
      kind: "other",
      labelKo: roleLabelKo("other"),
      placeTitle: node.title,
      nodeId: node.id,
    });
  }
  return roles;
}

function extractStayLabel(state: ContextWorkspaceState): string | null {
  const q = `${state.query} ${state.summaryKo}`;
  const m = q.match(/(\d+)\s*박\s*(\d+)\s*일/u);
  if (m) return `${m[1]}박${m[2]}일`;
  const n = q.match(/(\d+)\s*박/u);
  if (n) return `${n[1]}박`;
  return null;
}

function extractDest(state: ContextWorkspaceState): string {
  const q = state.query.trim();
  const m = q.match(/^(\S+)\s+/u);
  if (m?.[1] && !/여행|준비|동선/u.test(m[1])) return m[1];
  const s = state.summaryKo.replace(/\s*·.*$/u, "").trim();
  return s || "여행";
}

function buildGrounds(input: {
  readonly nodes: readonly ContextWorkspaceNode[];
  readonly hasLodging: boolean;
  readonly hasAirport: boolean;
  readonly poiCount: number;
  readonly stay: string | null;
}): string[] {
  const grounds: string[] = [];
  if (input.hasLodging) {
    grounds.push("숙소 중심 이동");
  }
  if (input.poiCount >= 2) {
    grounds.push(
      input.stay
        ? "하루 이동 반경 최소화"
        : "가까운 순 동선으로 배치",
    );
  }
  if (input.poiCount >= 3) {
    grounds.push("핵심 체험 독립 하루 배치");
  }
  if (input.hasAirport) {
    grounds.push("공항 접근성 고려");
  }
  if (grounds.length === 0 && input.nodes.length > 0) {
    grounds.push("지도에 올린 장소 기준");
  }
  return grounds.slice(0, MAX_GROUNDS);
}

/**
 * Build Context Brief from live Workspace state. Returns null if no visible nodes.
 */
export function buildContextBrief(
  state: ContextWorkspaceState,
): ContextBrief | null {
  const nodes = visibleNodes(state);
  if (nodes.length === 0) return null;

  const stay = extractStayLabel(state);
  const dest = extractDest(state);
  const hasLodging = nodes.some((n) => n.kind === "lodging");
  const hasAirport = nodes.some(looksAirport);
  const poiCount = nodes.filter(
    (n) => n.kind === "poi" || n.kind === "amenity",
  ).length;

  const titleKo = stay ? `${dest} ${stay}` : `${dest} 여행`;
  const thesisKo = stay
    ? `${stay} 기준 이동 최소화 일정`
    : hasLodging
      ? "숙소 중심 동선 초안"
      : "여행 Context 초안";

  return {
    titleKo,
    thesisKo,
    groundsKo: buildGrounds({
      nodes,
      hasLodging,
      hasAirport,
      poiCount,
      stay,
    }),
    roles: pickRoles(nodes),
    nodeIdsInOrder: buildBriefReplayNodeIds(state),
  };
}
