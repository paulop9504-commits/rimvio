/**
 * Workspace state transitions — NL edits the Workspace, not a chat paragraph.
 */

import {
  placeHitToWorkspaceNode,
  candidateToWorkspaceNode,
} from "@/lib/context-workspace/open-map-workspace";
import { buildWorkspaceWhy } from "@/lib/context-workspace/build-workspace-why";
import { optimizeWorkspaceNodeRoute } from "@/lib/context-workspace/optimize-workspace-route";
import {
  forcePinnedVisible,
  mergePreservePinnedNodes,
} from "@/lib/context-workspace/merge-preserve-pinned";
import type {
  ContextWorkspaceFilter,
  ContextWorkspaceNode,
  ContextWorkspaceState,
  ContextWorkspaceStateSnapshot,
  ContextWorkspaceTransitionOp,
  WorkspaceWhyEntry,
} from "@/lib/context-workspace/types";
import { domainLabelKo } from "@/lib/context-workspace/types";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { withWorkspaceRelationships } from "@/lib/context-workspace/sync-workspace-relationships";
import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";
import type { GraphFilterPredicate } from "@/lib/graph-command/types";

function snapshotOf(state: ContextWorkspaceState): ContextWorkspaceStateSnapshot {
  return {
    nodes: state.nodes,
    filter: state.filter,
    selectedIds: state.selectedIds,
    compareIds: state.compareIds,
    summaryKo: state.summaryKo,
  };
}

function withHistory(
  prev: ContextWorkspaceState,
  next: Omit<
    ContextWorkspaceState,
    | "history"
    | "future"
    | "updatedAtIso"
    | "version"
    | "workspaceId"
    | "contextEventId"
    | "domain"
    | "openedAtIso"
    | "committedAtIso"
    | "query"
    | "surfacePrimary"
    | "status"
    | "lastWhy"
    | "lastChangeKo"
    | "relationshipEdges"
    | "compilerIr"
  > &
    Partial<
      Pick<
        ContextWorkspaceState,
        | "query"
        | "surfacePrimary"
        | "status"
        | "committedAtIso"
        | "lastWhy"
        | "lastChangeKo"
        | "relationshipEdges"
        | "compilerIr"
      >
    >,
): ContextWorkspaceState {
  return {
    ...prev,
    ...next,
    version: prev.version,
    workspaceId: prev.workspaceId,
    contextEventId: prev.contextEventId,
    domain: prev.domain,
    query: next.query ?? prev.query,
    surfacePrimary: next.surfacePrimary ?? prev.surfacePrimary,
    status: next.status ?? prev.status,
    committedAtIso: next.committedAtIso ?? prev.committedAtIso,
    lastChangeKo:
      next.lastChangeKo !== undefined ? next.lastChangeKo : prev.lastChangeKo,
    lastWhy: next.lastWhy !== undefined ? next.lastWhy : prev.lastWhy,
    relationshipEdges:
      next.relationshipEdges ?? prev.relationshipEdges ?? [],
    openedAtIso: prev.openedAtIso,
    updatedAtIso: new Date().toISOString(),
    history: [...prev.history, snapshotOf(prev)].slice(-20),
    future: [],
  };
}

function applyFilterToNodes(
  nodes: readonly ContextWorkspaceNode[],
  filter: ContextWorkspaceFilter,
): ContextWorkspaceNode[] {
  return nodes.map((node) => {
    let visible = true;
    if (
      filter.minRating != null &&
      (node.rating == null || node.rating < filter.minRating)
    ) {
      visible = false;
    }
    if (
      filter.maxPriceBand != null &&
      (node.priceBand == null || node.priceBand > filter.maxPriceBand)
    ) {
      visible = false;
    }
    if (filter.tagIncludes?.length) {
      const has = filter.tagIncludes.every((tag) => node.tags.includes(tag));
      if (!has) {
        visible = false;
      }
    }
    if (filter.queryIncludes?.trim()) {
      const q = filter.queryIncludes.trim().toLowerCase();
      const blob = `${node.title} ${node.summaryKo} ${node.tags.join(" ")}`.toLowerCase();
      if (!blob.includes(q)) {
        visible = false;
      }
    }
    return { ...node, visible };
  });
}

function sortNodes(
  nodes: readonly ContextWorkspaceNode[],
  sortBy: GraphFilterPredicate["sortBy"] | "price_asc" | "rating_desc" | null,
): ContextWorkspaceNode[] {
  if (!sortBy) {
    return [...nodes];
  }
  const next = [...nodes];
  if (sortBy === "price_asc") {
    next.sort((a, b) => (a.priceBand ?? 99) - (b.priceBand ?? 99));
  } else if (sortBy === "rating_desc") {
    next.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
  return next;
}

export function mergeWorkspaceFilterFromGraphPredicate(
  predicate: GraphFilterPredicate,
  utterance?: string,
): ContextWorkspaceFilter {
  const tagIncludes: string[] = [];
  const text = utterance?.trim() ?? "";
  if (/오션|ocean|바다\s*뷰|해안|씨뷰|sea\s*view/i.test(text)) {
    tagIncludes.push("ocean_view");
  }
  return {
    minRating: predicate.minRating ?? null,
    maxPriceBand:
      predicate.sortBy === "price_asc" || /더\s*싸|저렴|budget|싼/i.test(text)
        ? 2
        : null,
    tagIncludes: tagIncludes.length ? tagIncludes : null,
    queryIncludes: null,
  };
}

export function applyWorkspaceTransition(input: {
  contextEventId: string;
  op: ContextWorkspaceTransitionOp;
  nodeIds?: readonly string[];
  filter?: ContextWorkspaceFilter | null;
  sortBy?: GraphFilterPredicate["sortBy"] | null;
  addHits?: readonly PlaceSearchHit[] | null;
  addCandidates?: readonly SearchToolCandidate[] | null;
  replaceHits?: readonly PlaceSearchHit[] | null;
  replaceCandidates?: readonly SearchToolCandidate[] | null;
  changeKo?: string | null;
  simulateScenarioKo?: string | null;
  /** Pin cart: true=pin, false=unpin, omit=toggle (bookmark op). */
  pin?: boolean | null;
}): ContextWorkspaceState | null {
  const prev = readContextWorkspace(input.contextEventId);
  if (!prev || prev.status === "closed") {
    return null;
  }

  if (input.op === "undo") {
    const snap = prev.history[prev.history.length - 1];
    if (!snap) {
      return prev;
    }
    const restored: ContextWorkspaceState = {
      ...prev,
      ...snap,
      updatedAtIso: new Date().toISOString(),
      lastChangeKo: "되돌렸어요",
      history: prev.history.slice(0, -1),
      future: [snapshotOf(prev), ...prev.future].slice(0, 20),
    };
    writeContextWorkspace(withWorkspaceRelationships(restored));
    return restored;
  }

  if (input.op === "redo") {
    const snap = prev.future[0];
    if (!snap) {
      return prev;
    }
    const restored: ContextWorkspaceState = {
      ...prev,
      ...snap,
      updatedAtIso: new Date().toISOString(),
      lastChangeKo: "다시 적용했어요",
      history: [...prev.history, snapshotOf(prev)].slice(-20),
      future: prev.future.slice(1),
    };
    writeContextWorkspace(withWorkspaceRelationships(restored));
    return restored;
  }

  if (input.op === "close") {
    const closed = withHistory(prev, {
      nodes: prev.nodes,
      filter: prev.filter,
      selectedIds: prev.selectedIds,
      compareIds: prev.compareIds,
      summaryKo: prev.summaryKo,
      status: "closed",
      lastChangeKo: "워크스페이스를 닫았어요",
    });
    writeContextWorkspace(withWorkspaceRelationships(closed));
    return closed;
  }

  let nodes = [...prev.nodes];
  let filter = { ...prev.filter };
  let selectedIds = [...prev.selectedIds];
  let compareIds = [...prev.compareIds];
  let summaryKo = prev.summaryKo;
  let lastChangeKo = input.changeKo?.trim() || null;
  let status = prev.status;
  let lastWhy: WorkspaceWhyEntry | null = prev.lastWhy;
  let addedCount = 0;
  let removedCount = 0;

  if (input.op === "replace_candidates") {
    const fromHits = (input.replaceHits ?? []).map((h, i) =>
      placeHitToWorkspaceNode(h, i, prev.domain),
    );
    const fromCandidates = (input.replaceCandidates ?? []).map((c, i) =>
      candidateToWorkspaceNode(c, i, prev.domain),
    );
    const incoming = new Map<string, ContextWorkspaceNode>();
    for (const node of [...fromCandidates, ...fromHits]) {
      incoming.set(node.placeId, node);
    }
    const pinnedKept = prev.nodes.filter((n) => n.bookmarked).length;
    nodes = mergePreservePinnedNodes(prev.nodes, [...incoming.values()], 36);
    selectedIds = selectedIds.filter((id) => nodes.some((n) => n.id === id));
    compareIds = compareIds.filter((id) => nodes.some((n) => n.id === id));
    filter = {};
    lastChangeKo =
      lastChangeKo ??
      (pinnedKept > 0
        ? `후보 갱신 · 고정 ${pinnedKept}곳 유지`
        : `후보 ${nodes.length}곳으로 바꿨어요`);
    summaryKo = `${nodes.length}곳`;
  }

  if (input.op === "add_nodes" || input.op === "find_similar") {
    const fromHits = (input.addHits ?? []).map((h, i) =>
      placeHitToWorkspaceNode(h, i, prev.domain),
    );
    const fromCandidates = (input.addCandidates ?? []).map((c, i) =>
      candidateToWorkspaceNode(c, i, prev.domain),
    );
    const existing = new Set(nodes.map((n) => n.placeId));
    const added: ContextWorkspaceNode[] = [];
    for (const node of [...fromCandidates, ...fromHits]) {
      if (existing.has(node.placeId)) {
        continue;
      }
      existing.add(node.placeId);
      added.push(node);
    }
    // Phase 1 similar fallback — clone selected with slight jitter if no hits.
    if (input.op === "find_similar" && added.length === 0) {
      const seeds = nodes.filter(
        (n) => selectedIds.includes(n.id) || n.selected,
      );
      const base = seeds[0] ?? nodes.find((n) => n.visible) ?? null;
      if (base) {
        for (let i = 0; i < 3; i += 1) {
          const placeId = `${base.placeId}-sim-${Date.now()}-${i}`;
          added.push({
            ...base,
            id: `ws:lodging:${placeId}`,
            placeId,
            title: `${base.title} · 비슷한 ${i + 1}`,
            lat: base.lat + (i + 1) * 0.004,
            lng: base.lng + (i + 1) * 0.003,
            tags: [...new Set([...base.tags, "similar"])],
            selected: false,
            bookmarked: false,
          });
        }
      }
    }
    nodes = [...nodes, ...added].slice(0, 32);
    addedCount = added.length;
    lastChangeKo =
      lastChangeKo ??
      (added.length > 0 ? `${added.length}곳 더 넣었어요` : "추가할 곳이 없어요");
    summaryKo = `${prev.domain === "eatery" ? "맛집" : "숙소"} ${nodes.filter((n) => n.visible).length}곳`;
  }

  if (input.op === "filter") {
    filter = { ...filter, ...(input.filter ?? {}) };
    nodes = forcePinnedVisible(applyFilterToNodes(nodes, filter));
    const visibleCount = nodes.filter((n) => n.visible).length;
    lastChangeKo = lastChangeKo ?? `${visibleCount}곳만 남겼어요`;
    summaryKo = `${domainLabelKo(prev.domain)} ${visibleCount}곳`;
  }

  if (input.op === "sort") {
    nodes = sortNodes(nodes, input.sortBy ?? null);
    lastChangeKo = lastChangeKo ?? "정렬했어요";
  }

  if (input.op === "remove") {
    const remove = new Set(input.nodeIds ?? []);
    const before = nodes.length;
    nodes = nodes.filter((n) => !remove.has(n.id) && !remove.has(n.placeId));
    removedCount = before - nodes.length;
    selectedIds = selectedIds.filter((id) => !remove.has(id));
    compareIds = compareIds.filter((id) => !remove.has(id));
    lastChangeKo = lastChangeKo ?? "빼 두었어요";
    summaryKo = `${nodes.filter((n) => n.visible).length}곳`;
  }

  if (input.op === "select") {
    const ids = new Set(input.nodeIds ?? []);
    nodes = nodes.map((n) => ({
      ...n,
      selected: ids.has(n.id) || ids.has(n.placeId),
    }));
    selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    lastChangeKo = lastChangeKo ?? "선택했어요";
  }

  if (input.op === "deselect") {
    const ids = new Set(input.nodeIds ?? []);
    nodes = nodes.map((n) =>
      ids.size === 0 || ids.has(n.id) || ids.has(n.placeId)
        ? { ...n, selected: false }
        : n,
    );
    selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    lastChangeKo = lastChangeKo ?? "선택을 해제했어요";
  }

  if (input.op === "bookmark") {
    const ids = new Set(input.nodeIds ?? []);
    const pinMode = input.pin;
    nodes = nodes.map((n) => {
      if (!ids.has(n.id) && !ids.has(n.placeId)) {
        return n;
      }
      const nextPinned =
        pinMode === true
          ? true
          : pinMode === false
            ? false
            : !n.bookmarked;
      return { ...n, bookmarked: nextPinned, visible: nextPinned ? true : n.visible };
    });
    const pinnedCount = nodes.filter((n) => n.bookmarked).length;
    const justPinned = nodes.some(
      (n) =>
        (ids.has(n.id) || ids.has(n.placeId)) && n.bookmarked,
    );
    lastChangeKo =
      lastChangeKo ??
      (pinMode === false || !justPinned
        ? `고정 해제 · 장바구니 ${pinnedCount}`
        : `고정했어요 · 장바구니 ${pinnedCount}`);
  }

  if (input.op === "compare") {
    compareIds = (input.nodeIds ?? selectedIds).slice(0, 4);
    lastChangeKo = lastChangeKo ?? `${compareIds.length}곳 비교`;
  }

  if (input.op === "simulate") {
    const scenario = input.simulateScenarioKo?.trim() || "가정";
    if (/비|rain/i.test(scenario)) {
      lastChangeKo = "비 오면 · 해안가보다 시내 숙소를 우선했어요";
      nodes = sortNodes(nodes, "rating_desc");
    } else if (/100|예산|budget|달러|달러/i.test(scenario)) {
      filter = { ...filter, maxPriceBand: 2 };
      nodes = forcePinnedVisible(applyFilterToNodes(nodes, filter));
      lastChangeKo = "예산 가정 · 저가 숙소만 남겼어요";
    } else {
      lastChangeKo = `가정: ${scenario}`;
    }
    summaryKo = `숙소 ${nodes.filter((n) => n.visible).length}곳`;
  }

  if (input.op === "optimize_route") {
    nodes = optimizeWorkspaceNodeRoute(nodes, selectedIds[0] ?? null);
    lastChangeKo = lastChangeKo ?? "동선을 가까운 순으로 바꿨어요";
    summaryKo = `동선 ${nodes.filter((n) => n.visible).length}곳`;
  }

  if (input.op === "commit") {
    status = "committing";
    lastChangeKo = lastChangeKo ?? "지구에 남기는 중…";
  }

  const nextVisibleCount = nodes.filter((n) => n.visible).length;
  if (input.op !== "deselect") {
    lastWhy = buildWorkspaceWhy({
      op: input.op,
      prev,
      nextVisibleCount,
      addedCount,
      removedCount,
      nodeIds:
        input.nodeIds ??
        (input.op === "compare" ? compareIds : selectedIds),
      simulateScenarioKo: input.simulateScenarioKo,
      changeKo: lastChangeKo,
    });
  }

  const next = withHistory(prev, {
    nodes,
    filter,
    selectedIds,
    compareIds,
    summaryKo,
    lastChangeKo,
    status,
    lastWhy,
  });
  writeContextWorkspace(withWorkspaceRelationships(next));
  return next;
}

export function parseWorkspaceUtteranceTransition(utterance: string): {
  op: ContextWorkspaceTransitionOp;
  filter?: ContextWorkspaceFilter;
  sortBy?: GraphFilterPredicate["sortBy"];
  simulateScenarioKo?: string;
  pin?: boolean;
} | null {
  const text = utterance.trim();
  if (!text) {
    return null;
  }
  if (/되돌|undo/i.test(text)) {
    return { op: "undo" };
  }
  if (/다시\s*적용|redo/i.test(text)) {
    return { op: "redo" };
  }
  if (/동선|최적화|optimize|route\s*opt|가까운\s*순/i.test(text)) {
    return { op: "optimize_route" };
  }
  if (/비슷|similar|관련|더\s*넣/i.test(text)) {
    return { op: "find_similar" };
  }
  if (/오션|ocean|바다\s*뷰|씨뷰|sea\s*view/i.test(text)) {
    return {
      op: "filter",
      filter: { tagIncludes: ["ocean_view"] },
    };
  }
  if (/평점|별점|rating|별\s*\d/i.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)/);
    return {
      op: "filter",
      filter: { minRating: m?.[1] ? Number(m[1]) : 4.5 },
    };
  }
  if (/더\s*싸|저렴|싼|가성비|budget|cheap|가격\s*낮은/i.test(text)) {
    return {
      op: "filter",
      filter: { maxPriceBand: 2 },
      sortBy: "price_asc",
    };
  }
  if (/예약\s*가능|바로\s*예약|reservable/i.test(text)) {
    return {
      op: "filter",
      filter: { tagIncludes: ["reservable"] },
    };
  }
  if (/현지인|로컬|local\s*favorite/i.test(text)) {
    return {
      op: "filter",
      filter: { tagIncludes: ["local_favorite"] },
    };
  }
  if (/고정\s*해제|핀\s*해제|언핀|unpin|장바구니\s*빼/i.test(text)) {
    return { op: "bookmark", pin: false };
  }
  if (/고정|핀\s*하|장바구니|pin\s*(this|it)?|bookmark/i.test(text)) {
    return { op: "bookmark", pin: true };
  }
  if (/삭제|지워|빼|제외|없애|remove|delete/i.test(text)) {
    return { op: "remove" };
  }
  if (/비교|compare|vs/i.test(text)) {
    return { op: "compare" };
  }
  if (/만약|가정|if\s+it|비가|비\s*오면|예산\s*넘/i.test(text)) {
    return { op: "simulate", simulateScenarioKo: text };
  }
  if (/이거|이걸로|commit|확정|남겨|지구에|커밋/i.test(text)) {
    return { op: "commit" };
  }
  return null;
}
