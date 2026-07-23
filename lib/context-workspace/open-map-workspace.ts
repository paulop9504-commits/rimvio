/**
 * Open Context Workspace for any map domain (lodging · eatery · poi · amenity).
 */

import {
  dispatchContextWorkspaceOpen,
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { withWorkspaceRelationships } from "@/lib/context-workspace/sync-workspace-relationships";
import { mergePreservePinnedNodes } from "@/lib/context-workspace/merge-preserve-pinned";
import {
  domainLabelKo,
  type ContextWorkspaceDomain,
  type ContextWorkspaceNode,
  type ContextWorkspaceOpenSource,
  type ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";
import type { GraphEntityDomain } from "@/lib/graph-command/types";

function inferTags(
  title: string,
  summary: string,
  flags?: { reservable?: boolean; localFavorite?: boolean },
): string[] {
  const blob = `${title} ${summary}`.toLowerCase();
  const tags: string[] = [];
  if (/ocean|오션|바다|해안|씨뷰|sea\s*view|beach/i.test(blob)) {
    tags.push("ocean_view");
  }
  if (/budget|저렴|가성비|저가|cheap|economy/i.test(blob)) {
    tags.push("budget");
  }
  if (/luxury|럭셔리|고급|5성|five\s*star/i.test(blob)) {
    tags.push("luxury");
  }
  if (flags?.reservable) {
    tags.push("reservable");
  }
  if (flags?.localFavorite) {
    tags.push("local_favorite");
  }
  return tags;
}

function placeIdOf(raw: string): string {
  const id = raw.trim();
  if (id.startsWith("maps:")) {
    return id.slice("maps:".length);
  }
  if (id.startsWith("liteapi:")) {
    return id.slice("liteapi:".length);
  }
  return id;
}

export function graphDomainToWorkspaceDomain(
  domain: GraphEntityDomain | string,
): ContextWorkspaceDomain {
  if (domain === "lodging" || domain === "eatery" || domain === "amenity") {
    return domain;
  }
  return "poi";
}

export function placeHitToWorkspaceNode(
  hit: PlaceSearchHit,
  index: number,
  domain: ContextWorkspaceDomain,
): ContextWorkspaceNode {
  const placeId = placeIdOf(hit.id) || `${domain}-${index}`;
  const summary =
    hit.amountLabel?.trim() ||
    (hit.priceBand != null ? `가격대 ${hit.priceBand}` : domainLabelKo(domain));
  return {
    id: `ws:${domain}:${placeId}`,
    kind: domain,
    placeId,
    title: hit.labelKo.trim() || domainLabelKo(domain),
    summaryKo: summary,
    lat: hit.lat,
    lng: hit.lng,
    rating: hit.rating ?? null,
    priceBand: hit.priceBand ?? null,
    amountLabel: hit.amountLabel ?? null,
    thumbnailUrl: null,
    tags: inferTags(hit.labelKo, summary, {
      reservable: hit.reservable,
      localFavorite: hit.localFavorite,
    }),
    visible: true,
    selected: false,
    bookmarked: false,
    source: hit.source,
  };
}

export function candidateToWorkspaceNode(
  candidate: SearchToolCandidate,
  index: number,
  domain: ContextWorkspaceDomain,
): ContextWorkspaceNode {
  const placeId = placeIdOf(candidate.id) || `${domain}-${index}`;
  const summary =
    candidate.amountLabel?.trim() ||
    (candidate.priceBand != null
      ? `가격대 ${candidate.priceBand}`
      : domainLabelKo(domain));
  return {
    id: `ws:${domain}:${placeId}`,
    kind: domain,
    placeId,
    title: candidate.labelKo.trim() || domainLabelKo(domain),
    summaryKo: summary,
    lat:
      typeof candidate.lat === "number" && Number.isFinite(candidate.lat)
        ? candidate.lat
        : 0,
    lng:
      typeof candidate.lng === "number" && Number.isFinite(candidate.lng)
        ? candidate.lng
        : 0,
    rating: candidate.rating ?? null,
    priceBand: candidate.priceBand ?? null,
    amountLabel: candidate.amountLabel ?? null,
    thumbnailUrl: null,
    tags: inferTags(candidate.labelKo, summary, {
      reservable: candidate.reservable ?? undefined,
      localFavorite: candidate.localFavorite ?? undefined,
    }),
    visible: true,
    selected: false,
    bookmarked: false,
    source: candidate.source ?? "maps",
  };
}

/** @deprecated use placeHitToWorkspaceNode */
export function lodgingHitToWorkspaceNode(
  hit: PlaceSearchHit,
  index: number,
): ContextWorkspaceNode {
  return placeHitToWorkspaceNode(hit, index, "lodging");
}

/** @deprecated use candidateToWorkspaceNode */
export function lodgingCandidateToWorkspaceNode(
  candidate: SearchToolCandidate,
  index: number,
): ContextWorkspaceNode {
  return candidateToWorkspaceNode(candidate, index, "lodging");
}

export function openMapContextWorkspace(input: {
  contextEventId: string;
  domain: ContextWorkspaceDomain | GraphEntityDomain;
  query: string;
  summaryKo?: string | null;
  hits?: readonly PlaceSearchHit[] | null;
  candidates?: readonly SearchToolCandidate[] | null;
  source?: ContextWorkspaceOpenSource;
}): ContextWorkspaceState {
  const contextEventId = input.contextEventId.trim();
  const domain = graphDomainToWorkspaceDomain(input.domain);
  const fromHits = (input.hits ?? []).map((h, i) =>
    placeHitToWorkspaceNode(h, i, domain),
  );
  const fromCandidates = (input.candidates ?? []).map((c, i) =>
    candidateToWorkspaceNode(c, i, domain),
  );
  const merged = new Map<string, ContextWorkspaceNode>();
  for (const node of [...fromCandidates, ...fromHits]) {
    if (!merged.has(node.placeId)) {
      merged.set(node.placeId, node);
    }
  }
  const nodesIncoming = [...merged.values()].slice(0, 24);
  const prev = readContextWorkspace(contextEventId);
  const pinnedCount =
    prev?.status === "editing" || prev?.status === "committing"
      ? prev.nodes.filter((n) => n.bookmarked).length
      : 0;
  const nodes =
    prev && (prev.status === "editing" || prev.status === "committing")
      ? mergePreservePinnedNodes(prev.nodes, nodesIncoming, 36)
      : nodesIncoming;
  const now = new Date().toISOString();
  const workspaceId =
    prev && (prev.status === "editing" || prev.status === "committing")
      ? prev.workspaceId
      : `ws:${contextEventId}:${Date.now()}`;
  const label = domainLabelKo(domain);
  const state: ContextWorkspaceState = {
    version: 1,
    workspaceId,
    contextEventId,
    domain,
    status: "editing",
    query: input.query.trim(),
    summaryKo:
      input.summaryKo?.trim() ||
      (nodes.length > 0
        ? pinnedCount > 0
          ? `${label} ${nodesIncoming.length}곳 + 고정 ${pinnedCount}`
          : `${label} 후보 ${nodes.length}곳 준비 · 펼치기로 작업장 열기`
        : `${label} 결과가 없어요`),
    nodes,
    filter: {},
    selectedIds: [],
    compareIds: [],
    surfacePrimary: "embedded_preview",
    openedAtIso: prev?.openedAtIso ?? now,
    updatedAtIso: now,
    committedAtIso: null,
    lastChangeKo:
      nodes.length > 0
        ? pinnedCount > 0
          ? `${label} 갱신 · 고정 ${pinnedCount}곳 유지`
          : `${nodesIncoming.length}곳 추가`
        : null,
    lastWhy:
      nodes.length > 0
        ? {
            actionKo: `${label} ${nodesIncoming.length}곳 생성`,
            reasonsKo:
              pinnedCount > 0
                ? ["검색 의도 일치", `고정 ${pinnedCount}곳 장바구니 유지`]
                : ["검색 의도 일치", "지도 후보군"],
            impactsKo: [`${nodes.length}곳 Workspace에 반영`],
            nodeIds: nodes.slice(0, 3).map((n) => n.id),
            atIso: now,
          }
        : null,
    history: prev?.history ?? [],
    future: [],
    relationshipEdges: [],
    compilerIr: prev?.compilerIr ?? null,
  };
  writeContextWorkspace(withWorkspaceRelationships(state, input.query));
  dispatchContextWorkspaceOpen({
    contextEventId,
    workspaceId,
    source: input.source ?? "map_search",
  });
  return state;
}

/** Lodging shorthand — same engine. */
export function openLodgingContextWorkspace(input: {
  contextEventId: string;
  query: string;
  summaryKo?: string | null;
  hits?: readonly PlaceSearchHit[] | null;
  candidates?: readonly SearchToolCandidate[] | null;
  source?: ContextWorkspaceOpenSource;
}): ContextWorkspaceState {
  return openMapContextWorkspace({
    ...input,
    domain: "lodging",
    source: input.source ?? "hotel_search",
  });
}
