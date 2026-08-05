/**
 * Apply Workspace Patch — Patch-unit mutation only (no Answer storage).
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import { applyWorkspaceRealityPatch } from "@/lib/context-workspace/apply-workspace-reality-patch";
import {
  ensureWorkspaceAnchorNode,
  resolveRealityAnchorFromUtterance,
} from "@/lib/context-workspace/reality-anchor";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { WorkspacePatch } from "@/lib/context-workspace/workspace-patch/types";
import type { WorkspacePatchRecord } from "@/lib/context-workspace/workspace-patch/types";
import { runAutoProjectionAfterPatch } from "@/lib/context-workspace/auto-projection";
import { applyNetworkAbsorbVisibilityPatch } from "@/lib/reality-provider/network-absorb-projection-store";
import { buildRealityDraft } from "@/lib/context-workspace/reality-draft";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import {
  parseLodgingStayTypeFromText,
  resolveLodgingStaySearchKeyword,
  normalizeLodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";
import { rememberConstraintsOnWorkspace } from "@/lib/agent-policy/stamp-constitution-on-workspace";
import { optimizeWorkspaceNodeRoute } from "@/lib/context-workspace/optimize-workspace-route";
import {
  emptyWorkspaceRealityPlan,
  mergeWorkspaceRealityPlan,
} from "@/lib/context-workspace/workspace-reality-patch";

const DAY_TAG_RE = /^day[_-]?\d+$/iu;

function softRefineSortNodes(
  nodes: readonly ContextWorkspaceNode[],
  sortBy: "price" | "rating" | "value" | null | undefined,
): ContextWorkspaceNode[] {
  if (!sortBy) return [...nodes];
  const next = [...nodes];
  if (sortBy === "price") {
    next.sort((a, b) => (a.priceBand ?? 99) - (b.priceBand ?? 99));
  } else if (sortBy === "rating") {
    next.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else {
    // value = cheaper first, then higher rating
    next.sort((a, b) => {
      const pd = (a.priceBand ?? 99) - (b.priceBand ?? 99);
      if (pd !== 0) return pd;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }
  return next;
}

function applySoftKeepVisible(
  nodes: readonly ContextWorkspaceNode[],
  keepTopN: number | null | undefined,
  relativeCheaper: boolean | null | undefined,
): ContextWorkspaceNode[] {
  const ranked = nodes.filter(
    (n) =>
      n.visible &&
      n.source !== "reality_anchor" &&
      !n.tags.includes("reality_anchor"),
  );
  const keep = new Set<string>();
  for (const n of nodes) {
    if (n.bookmarked || n.selected) keep.add(n.id);
  }

  if (keepTopN != null && keepTopN >= 1) {
    for (const n of ranked.slice(0, keepTopN)) {
      keep.add(n.id);
    }
  } else if (relativeCheaper && ranked.length > 1) {
    const bands = ranked
      .map((n) => n.priceBand)
      .filter((b): b is number => b != null && Number.isFinite(b))
      .sort((a, b) => a - b);
    if (bands.length > 0) {
      const mid = bands[Math.floor((bands.length - 1) / 2)]!;
      for (const n of ranked) {
        if (n.priceBand == null || n.priceBand <= mid) keep.add(n.id);
      }
    } else {
      for (const n of ranked) keep.add(n.id);
    }
  } else {
    for (const n of ranked) keep.add(n.id);
  }

  // Never empty the set — if soft rule wiped everything, keep ranked as-is.
  if (keep.size === 0) {
    for (const n of ranked) keep.add(n.id);
  }

  return nodes.map((n) => {
    if (n.source === "reality_anchor" || n.tags.includes("reality_anchor")) {
      return n;
    }
    if (!ranked.some((r) => r.id === n.id)) {
      return n;
    }
    return { ...n, visible: keep.has(n.id) };
  });
}

function parseNightlyKrwFromNode(node: ContextWorkspaceNode): number | null {
  const label = node.amountLabel?.trim() ?? "";
  if (!label) return null;
  const m = label.match(/(\d[\d,]*)/);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(/,/gu, ""));
  return Number.isFinite(n) ? n : null;
}

/** Soft budget leave — hide above max nightly KRW; keep selected/bookmarked. */
function applyMaxNightlyVisible(
  nodes: readonly ContextWorkspaceNode[],
  maxNightlyPriceKrw: number,
): ContextWorkspaceNode[] {
  const ranked = nodes.filter(
    (n) =>
      n.visible &&
      n.source !== "reality_anchor" &&
      !n.tags.includes("reality_anchor"),
  );
  const keep = new Set<string>();
  for (const n of nodes) {
    if (n.bookmarked || n.selected) keep.add(n.id);
  }
  for (const n of ranked) {
    const krw = parseNightlyKrwFromNode(n);
    if (krw == null || krw <= maxNightlyPriceKrw) keep.add(n.id);
  }
  if (keep.size === 0) {
    for (const n of ranked) keep.add(n.id);
  }
  return nodes.map((n) => {
    if (n.source === "reality_anchor" || n.tags.includes("reality_anchor")) {
      return n;
    }
    if (!ranked.some((r) => r.id === n.id)) {
      return n;
    }
    return { ...n, visible: keep.has(n.id) };
  });
}

/** Visible place order for ordinal delete / schedule — list sheet order. */
function listVisiblePlaceOrder(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.filter(
    (n) =>
      n.visible &&
      n.source !== "reality_anchor" &&
      !n.tags.includes("reality_anchor") &&
      (n.kind === "lodging" ||
        n.kind === "eatery" ||
        n.kind === "poi" ||
        n.kind === "amenity"),
  );
}

function listVisibleScheduleCandidates(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.filter(
    (n) =>
      n.visible &&
      (n.kind === "eatery" ||
        n.kind === "lodging" ||
        n.kind === "poi" ||
        n.kind === "amenity") &&
      n.source !== "reality_anchor" &&
      !n.tags.includes("reality_anchor"),
  );
}

function stampDayTag(
  node: ContextWorkspaceNode,
  day: number,
): ContextWorkspaceNode {
  const tags = [
    ...node.tags.filter((t) => !DAY_TAG_RE.test(t)),
    `day_${day}`,
  ];
  return {
    ...node,
    tags,
    selected: true,
  };
}

function clearDayTag(
  node: ContextWorkspaceNode,
  day: number,
): ContextWorkspaceNode {
  const tags = node.tags.filter(
    (t) => !new RegExp(`^day[_-]?${day}$`, "iu").test(t),
  );
  return { ...node, tags };
}

function nodeOnDay(node: ContextWorkspaceNode, day: number): boolean {
  return node.tags.some((t) => new RegExp(`^day[_-]?${day}$`, "iu").test(t));
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** P4 — nearest-neighbor order among one day's stops. */
function orderDayStops(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  if (nodes.length <= 1) return [...nodes];
  return optimizeWorkspaceNodeRoute(nodes, nodes[0]?.id ?? null).filter((n) =>
    nodes.some((d) => d.id === n.id),
  );
}

function matchNodeByQuery(
  nodes: readonly ContextWorkspaceNode[],
  query: string,
): ContextWorkspaceNode | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    nodes.find((n) => {
      const blob = `${n.title} ${n.summaryKo} ${n.tags.join(" ")}`.toLowerCase();
      return blob.includes(q);
    }) ?? null
  );
}

export type ApplyWorkspacePatchResult = {
  readonly ok: boolean;
  readonly statusKo: string;
  readonly record: WorkspacePatchRecord | null;
  readonly needsRescout: boolean;
  readonly scoutQuery: string | null;
};

function appendPatchRecord(
  contextEventId: string,
  record: WorkspacePatchRecord,
): void {
  const state = readContextWorkspace(contextEventId);
  if (!state) return;
  const prev = Array.isArray(state.patches) ? state.patches : [];
  writeContextWorkspace({
    ...state,
    patches: [...prev, record].slice(-40),
    lastChangeKo: record.statusKo,
    updatedAtIso: record.atIso,
  });
}

function makeRecord(input: {
  readonly patch: WorkspacePatch;
  readonly utterance: string | null;
  readonly statusKo: string;
}): WorkspacePatchRecord {
  return {
    id: `patch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: input.patch.kind,
    patch: input.patch,
    utterance: input.utterance,
    statusKo: input.statusKo,
    atIso: new Date().toISOString(),
    answerForbidden: true,
  };
}

/**
 * Apply one Patch to the provisional Workspace.
 * Never writes assistant essay answers into Workspace SSOT.
 */
export function applyWorkspacePatch(input: {
  readonly contextEventId: string;
  readonly patch: WorkspacePatch;
  readonly utterance?: string | null;
  /** When true, caller runs Auto Projection (Agent Loop). Default: auto. */
  readonly skipAutoProjection?: boolean;
}): ApplyWorkspacePatchResult {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance?.trim() || null;
  if (!contextEventId) {
    return {
      ok: false,
      statusKo: "Workspace 없음",
      record: null,
      needsRescout: false,
      scoutQuery: null,
    };
  }

  const state = readContextWorkspace(contextEventId);
  if (!state || (state.status !== "editing" && state.status !== "committing")) {
    return {
      ok: false,
      statusKo: "편집 중인 Workspace 없음",
      record: null,
      needsRescout: false,
      scoutQuery: null,
    };
  }

  const patch = input.patch;
  let statusKo = "Patch 적용";
  let needsRescout = false;
  let scoutQuery: string | null = null;

  switch (patch.kind) {
    case "replace_entity": {
      const reality = applyWorkspaceRealityPatch({
        contextEventId,
        utterance: utterance ?? patch.query ?? "더 싼 호텔",
        patch: {
          ...(patch.cheaper ? { maxPriceBand: 2 } : {}),
          ...(patch.stayType
            ? {
                stayType: patch.stayType as never,
              }
            : {}),
        },
      });
      statusKo = reality.replyKo ?? "후보를 교체 패치했어요";
      needsRescout = reality.needsRescout;
      scoutQuery = reality.scoutQuery;
      break;
    }
    case "spatial_constraint": {
      const stayType =
        normalizeLodgingStayType(patch.stayType) ??
        parseLodgingStayTypeFromText(utterance ?? "") ??
        null;
      const reality = applyWorkspaceRealityPatch({
        contextEventId,
        utterance: utterance ?? `${patch.nearLabelKo} 근처`,
        patch: {
          stationNear: patch.stationNear === true,
          ...(stayType ? { stayType } : {}),
        },
      });
      const anchorHit = resolveRealityAnchorFromUtterance(
        utterance ?? patch.nearLabelKo,
      );
      if (anchorHit) {
        ensureWorkspaceAnchorNode({
          contextEventId,
          anchor: {
            entityId: anchorHit.geoId,
            titleKo: anchorHit.labelKo,
            labelKo: anchorHit.labelKo,
            kind: anchorHit.kind === "station" ? "station" : "attraction",
            lat: anchorHit.lat,
            lng: anchorHit.lng,
          },
          geoId: anchorHit.geoId,
          summaryKo: `${anchorHit.labelKo} · 숙소 기준점`,
        });
      }
      // Persist near label on lastChange; filter queryIncludes for projection.
      applyWorkspaceTransition({
        contextEventId,
        op: "filter",
        filter: {
          queryIncludes: patch.nearLabelKo,
        },
        changeKo: stayType
          ? `${patch.nearLabelKo} 근처 · ${stayType}`
          : `${patch.nearLabelKo} 근처 제약`,
      });
      statusKo =
        reality.replyKo ??
        (stayType
          ? `공간 제약 · ${patch.nearLabelKo} 근처 ${stayType}`
          : `공간 제약 · ${patch.nearLabelKo} 근처`);
      needsRescout = true;
      const lodgingCue =
        Boolean(stayType) ||
        /숙소|호텔|lodging|hotel|캡슐|료칸/iu.test(utterance ?? "") ||
        state.domain === "lodging";
      const stayKw = lodgingCue
        ? resolveLodgingStaySearchKeyword({
            stayType,
            message: utterance,
            areaHint: patch.nearLabelKo,
          })
        : null;
      scoutQuery =
        stayKw ||
        `${patch.nearLabelKo} 근처 ${lodgingCue ? "숙소" : "장소"}`;
      // Prefer full NL so lodging rescout keeps Anchor + stay cues.
      if (utterance?.trim() && lodgingCue) {
        scoutQuery = utterance.trim();
      }
      break;
    }
    case "filter_entity": {
      const softSort = patch.filter.sortBy ?? null;
      const keepTopN = patch.filter.keepTopN ?? null;
      const relativeCheaper = Boolean(patch.filter.relativeCheaper);
      const maxNightlyPriceKrw = patch.filter.maxNightlyPriceKrw ?? null;
      const storeFilter = {
        minRating: patch.filter.minRating ?? null,
        maxPriceBand: patch.filter.maxPriceBand ?? null,
        tagIncludes: patch.filter.tagIncludes ?? null,
        queryIncludes: patch.filter.queryIncludes ?? null,
      };

      // Soft refine: if hard maxPriceBand would hide every candidate, drop it.
      let safeFilter = storeFilter;
      if (storeFilter.maxPriceBand != null) {
        const probe = readContextWorkspace(contextEventId);
        if (probe) {
          const wouldRemain = probe.nodes.filter((n) => {
            if (n.bookmarked || n.selected) return true;
            if (n.source === "reality_anchor" || n.tags.includes("reality_anchor")) {
              return true;
            }
            if (!n.visible) return false;
            return n.priceBand != null && n.priceBand <= storeFilter.maxPriceBand!;
          });
          if (wouldRemain.length === 0) {
            safeFilter = { ...storeFilter, maxPriceBand: null };
          }
        }
      }

      applyWorkspaceTransition({
        contextEventId,
        op: "filter",
        filter: safeFilter,
        changeKo: "필터 패치",
      });

      const tags = patch.filter.tagIncludes ?? [];
      if (tags.some((t) => t.startsWith("stay:"))) {
        const stayRaw = tags
          .find((t) => t.startsWith("stay:"))
          ?.replace(/^stay:/, "");
        const stay = stayRaw
          ? normalizeLodgingStayType(stayRaw)
          : null;
        const live = readContextWorkspace(contextEventId);
        const visibleStay =
          live?.nodes.filter(
            (n) =>
              n.visible &&
              stayRaw != null &&
              n.tags.includes(`stay:${stayRaw}`),
          ).length ?? 0;
        // Soft「만 보여」— stamp plan + keep in-set; rescout only if none match.
        if (live && stay && visibleStay > 0) {
          const plan = mergeWorkspaceRealityPlan(
            live.realityPlan ?? emptyWorkspaceRealityPlan(),
            { stayType: stay },
            `${stay}만`,
          );
          writeContextWorkspace({
            ...live,
            realityPlan: plan,
            lastChangeKo: `${stay} · ${visibleStay}곳`,
            updatedAtIso: new Date().toISOString(),
          });
          statusKo = `${stay} · ${visibleStay}곳`;
          needsRescout = false;
        } else {
          const reality = applyWorkspaceRealityPatch({
            contextEventId,
            utterance: utterance ?? "필터",
            patch: stay ? { stayType: stay } : {},
          });
          needsRescout = reality.needsRescout;
          scoutQuery = reality.scoutQuery;
          statusKo = reality.replyKo ?? "필터 패치 적용";
        }
      } else if (
        softSort ||
        keepTopN != null ||
        relativeCheaper ||
        maxNightlyPriceKrw != null
      ) {
        const live = readContextWorkspace(contextEventId);
        if (live) {
          let refined = softRefineSortNodes(live.nodes, softSort);
          if (maxNightlyPriceKrw != null) {
            refined = applyMaxNightlyVisible(refined, maxNightlyPriceKrw);
          }
          if (softSort || keepTopN != null || relativeCheaper) {
            refined = applySoftKeepVisible(
              refined,
              keepTopN,
              relativeCheaper,
            );
          }
          const visible = refined.filter((n) => n.visible).length;
          writeContextWorkspace({
            ...live,
            nodes: refined,
            summaryKo: `${visible}곳`,
            lastChangeKo:
              maxNightlyPriceKrw != null
                ? `지금 후보 안에서 ${Math.round(maxNightlyPriceKrw / 10_000)}만원 이하만 남겼어요`
                : keepTopN != null
                  ? `지금 후보 안에서 상위 ${keepTopN}곳만 남겼어요`
                  : relativeCheaper
                    ? "지금 후보 안에서 더 싼 쪽으로 골랐어요"
                    : "지금 후보 안에서 정렬했어요",
            updatedAtIso: new Date().toISOString(),
          });
          statusKo =
            maxNightlyPriceKrw != null
              ? `지금 후보 · ${Math.round(maxNightlyPriceKrw / 10_000)}만원 이하`
              : keepTopN != null
                ? `지금 후보 · 상위 ${keepTopN}곳`
                : relativeCheaper
                  ? "지금 후보 · 가성비 정리"
                  : "지금 후보 · 정렬";
        } else {
          statusKo = "필터 패치 적용";
        }
      } else {
        const visible =
          readContextWorkspace(contextEventId)?.nodes.filter((n) => n.visible)
            .length ?? 0;
        statusKo = `필터 패치 · ${visible}곳`;
      }
      break;
    }
    case "delete_entity": {
      const live = readContextWorkspace(contextEventId);
      const places = live ? listVisiblePlaceOrder(live.nodes) : [];
      const fromOrdinal =
        patch.ordinalIndex != null &&
        patch.ordinalIndex >= 0 &&
        patch.ordinalIndex < places.length
          ? places[patch.ordinalIndex]!.id
          : null;
      let fromTitle: string[] = [];
      if (
        patch.entityIds.length === 0 &&
        fromOrdinal == null &&
        state.selectedIds.length === 0 &&
        utterance?.trim()
      ) {
        const hint =
          utterance
            .match(
              /([\uac00-\ud7a3A-Za-z0-9·\s]{2,28}?)\s*(?:을|를|은|는)?\s*(?:빼|삭제|지워|제외|없애)/u,
            )?.[1]
            ?.trim()
            .replace(/^(?:이|그|저)\s*(?:호텔|숙소|맛집|거|곳)?\s*/u, "")
            .trim() ?? "";
        if (hint.length >= 2 && !/^(?:이|그|저|호텔|숙소|맛집)$/u.test(hint)) {
          const q = hint.toLowerCase();
          fromTitle = (live?.nodes ?? [])
            .filter((n) => {
              if (!n.visible) return false;
              const blob = `${n.title} ${n.summaryKo}`.toLowerCase();
              return blob.includes(q) || q.includes(n.title.toLowerCase());
            })
            .map((n) => n.id);
        }
      }
      const ids =
        patch.entityIds.length > 0
          ? patch.entityIds
          : fromOrdinal
            ? [fromOrdinal]
            : fromTitle.length > 0
              ? fromTitle
              : state.selectedIds.length > 0
                ? state.selectedIds
                : [];
      if (ids.length === 0) {
        statusKo = "삭제할 Entity 없음";
        break;
      }
      applyWorkspaceTransition({
        contextEventId,
        op: "remove",
        nodeIds: ids,
        changeKo: "Entity 삭제 패치",
      });
      statusKo = `${ids.length}곳 삭제 패치`;
      break;
    }
    case "create_entity": {
      statusKo = "Create Entity · Tool 스카우트 대기";
      needsRescout = true;
      scoutQuery = patch.query ?? utterance;
      break;
    }
    case "connect_entity": {
      const fromId =
        patch.fromId ||
        state.selectedIds[0] ||
        state.nodes.find((n) => n.selected)?.id ||
        "";
      const toId =
        patch.toId ||
        state.selectedIds[1] ||
        state.compareIds[0] ||
        "";
      if (fromId && toId) {
        applyWorkspaceTransition({
          contextEventId,
          op: "compare",
          nodeIds: [fromId, toId],
          changeKo: "Connect Entity 패치",
        });
        const live = readContextWorkspace(contextEventId);
        if (live) {
          const edgeId = `patch_connect_${fromId}_${toId}`;
          writeContextWorkspace({
            ...live,
            relationshipEdges: [
              ...(live.relationshipEdges ?? []).filter((e) => e.id !== edgeId),
              {
                id: edgeId,
                kind: patch.relation ?? "nearby",
                fromId,
                toId,
                labelKo: patch.labelKo ?? "연결",
                meters: patch.meters ?? null,
              },
            ],
          });
        }
        statusKo = "Connect Entity 패치";
      } else {
        statusKo = "연결할 Entity 선택 필요";
      }
      break;
    }
    case "disconnect_entity": {
      const live = readContextWorkspace(contextEventId);
      if (live) {
        writeContextWorkspace({
          ...live,
          relationshipEdges: (live.relationshipEdges ?? []).filter(
            (e) =>
              !(
                (e.fromId === patch.fromId && e.toId === patch.toId) ||
                (e.fromId === patch.toId && e.toId === patch.fromId)
              ),
          ),
          lastChangeKo: "Disconnect Entity 패치",
          updatedAtIso: new Date().toISOString(),
        });
      }
      statusKo = "Disconnect Entity 패치";
      break;
    }
    case "move_schedule": {
      const live = readContextWorkspace(contextEventId);
      const day = patch.dayIndex + 1;
      const kindHint = /호텔|숙소|lodging|hotel/iu.test(utterance ?? "")
        ? ("lodging" as const)
        : /맛집|식당|레스토랑|카페|eatery|cafe|restaurant/iu.test(
              utterance ?? "",
            )
          ? ("eatery" as const)
          : null;
      const places = live
        ? listVisibleScheduleCandidates(live.nodes).filter((n) =>
            kindHint ? n.kind === kindHint : true,
          )
        : [];
      const fromOrdinal =
        patch.ordinalIndex != null &&
        patch.ordinalIndex >= 0 &&
        patch.ordinalIndex < places.length
          ? places[patch.ordinalIndex]!.id
          : null;
      const fromQuery =
        patch.queryIncludes && live
          ? matchNodeByQuery(
              kindHint
                ? live.nodes.filter((n) => n.kind === kindHint)
                : live.nodes,
              patch.queryIncludes,
            )?.id ?? null
          : null;
      const entityId =
        patch.entityId ||
        fromOrdinal ||
        fromQuery ||
        live?.selectedIds[0] ||
        live?.nodes.find((n) => n.selected)?.id ||
        places[0]?.id ||
        live?.nodes.find((n) => n.visible)?.id ||
        null;
      if (live && entityId) {
        const dayNodeId = `schedule:day${day}`;
        const prevEdges = live.relationshipEdges ?? [];
        const scheduleEdge = {
          id: `schedule_${entityId}_day${day}`,
          kind: "route" as const,
          fromId: entityId,
          toId: dayNodeId,
          labelKo: `Day${day} Draft`,
          meters: null as number | null,
        };
        const edges = [
          ...prevEdges.filter(
            (e) =>
              !(
                e.id.startsWith("schedule_") &&
                (e.fromId === entityId || e.toId?.startsWith("schedule:day"))
              ),
          ),
          scheduleEdge,
        ].slice(0, 64);

        const nodes = live.nodes.map((n) =>
          n.id === entityId ? stampDayTag(n, day) : n,
        );
        const moved = nodes.find((n) => n.id === entityId) ?? null;
        const realityDraft =
          buildRealityDraft({
            contextTitleKo: live.summaryKo || live.query || "여행",
            destinationKo: live.realityDraft?.destinationKo ?? null,
            stayLabelKo: live.realityDraft?.stayLabelKo ?? null,
            nodes,
          }) ?? live.realityDraft ?? null;

        writeContextWorkspace({
          ...live,
          nodes,
          selectedIds: [entityId],
          relationshipEdges: edges,
          realityDraft,
          lastChangeKo: moved
            ? `${moved.title} · Day${day} 일정에 넣었어요`
            : `Day${day} Draft · 일정 이동`,
          realityPlan: {
            ...(live.realityPlan ?? {
              stayType: null,
              maxPriceBand: null,
              minRating: null,
              stationNear: false,
              onsenRequired: false,
              editCount: 0,
              lastEditKo: "",
              updatedAtIso: new Date().toISOString(),
            }),
            lastEditKo: `move_schedule:day${day}:${entityId}`,
            editCount: (live.realityPlan?.editCount ?? 0) + 1,
            updatedAtIso: new Date().toISOString(),
          },
          updatedAtIso: new Date().toISOString(),
        });
        statusKo = moved
          ? `${moved.title} · Day${day} 일정에 넣었어요`
          : `Day${day} Draft 생성`;
        // P4 — refresh NN route + meters after day placement
        applyWorkspacePatch({
          contextEventId,
          patch: { kind: "rebuild_route", dayIndex: patch.dayIndex },
          utterance: utterance ?? `Day${day} 동선`,
          skipAutoProjection: true,
        });
        {
          const afterRoute = readContextWorkspace(contextEventId);
          if (afterRoute?.lastChangeKo?.includes("동선")) {
            statusKo = `${statusKo} · ${afterRoute.lastChangeKo}`;
          }
        }
      } else if (live) {
        writeContextWorkspace({
          ...live,
          lastChangeKo: `Day${day} Draft`,
          realityPlan: {
            ...(live.realityPlan ?? {
              stayType: null,
              maxPriceBand: null,
              minRating: null,
              stationNear: false,
              onsenRequired: false,
              editCount: 0,
              lastEditKo: "",
              updatedAtIso: new Date().toISOString(),
            }),
            lastEditKo: `move_schedule:day${day}`,
            editCount: (live.realityPlan?.editCount ?? 0) + 1,
            updatedAtIso: new Date().toISOString(),
          },
          updatedAtIso: new Date().toISOString(),
        });
        statusKo = `Day${day} Draft 생성`;
      } else {
        statusKo = `Day${day} Draft 생성`;
      }
      break;
    }
    case "remove_schedule": {
      const live = readContextWorkspace(contextEventId);
      const day = patch.dayIndex + 1;
      if (!live) {
        statusKo = "삭제할 일정 없음";
        break;
      }
      const onDay = live.nodes.filter((n) => nodeOnDay(n, day));
      const target =
        (patch.entityId
          ? live.nodes.find(
              (n) => n.id === patch.entityId || n.placeId === patch.entityId,
            )
          : null) ??
        (patch.queryIncludes
          ? matchNodeByQuery(
              onDay.length > 0 ? onDay : live.nodes,
              patch.queryIncludes,
            )
          : null) ??
        onDay[0] ??
        null;
      if (!target) {
        statusKo = `Day${day}에서 뺄 장소 없음`;
        break;
      }
      const nodes = live.nodes.map((n) =>
        n.id === target.id ? clearDayTag(n, day) : n,
      );
      const prevEdges = live.relationshipEdges ?? [];
      const edges = prevEdges.filter(
        (e) =>
          !(
            e.id === `schedule_${target.id}_day${day}` ||
            (e.fromId === target.id && e.toId === `schedule:day${day}`) ||
            (e.toId === target.id && e.fromId === `schedule:day${day}`)
          ),
      );
      const realityDraft =
        buildRealityDraft({
          contextTitleKo: live.summaryKo || live.query || "여행",
          destinationKo: live.realityDraft?.destinationKo ?? null,
          stayLabelKo: live.realityDraft?.stayLabelKo ?? null,
          nodes,
        }) ?? live.realityDraft ?? null;
      writeContextWorkspace({
        ...live,
        nodes,
        relationshipEdges: edges,
        realityDraft,
        lastChangeKo: `${target.title} · Day${day}에서 뺐어요`,
        updatedAtIso: new Date().toISOString(),
      });
      statusKo = `${target.title} · Day${day}에서 뺐어요`;
      applyWorkspacePatch({
        contextEventId,
        patch: { kind: "rebuild_route", dayIndex: patch.dayIndex },
        utterance: utterance ?? `Day${day} 동선`,
        skipAutoProjection: true,
      });
      break;
    }
    case "rebuild_route": {
      const live = readContextWorkspace(contextEventId);
      const day = patch.dayIndex + 1;
      if (!live) {
        statusKo = "동선 재구성 실패";
        break;
      }
      const onDayRaw = live.nodes.filter(
        (n) => n.visible && nodeOnDay(n, day),
      );
      const onDay = orderDayStops(onDayRaw);
      const dayNodeId = `schedule:day${day}`;
      const kept = (live.relationshipEdges ?? []).filter(
        (e) =>
          !(
            e.toId === dayNodeId ||
            e.fromId === dayNodeId ||
            (e.kind === "route" && e.id.startsWith(`route_day${day}_`))
          ),
      );
      const routeEdges = onDay.slice(0, -1).map((from, i) => {
        const to = onDay[i + 1]!;
        return {
          id: `route_day${day}_${from.id}_${to.id}`,
          kind: "route" as const,
          fromId: from.id,
          toId: to.id,
          labelKo: `Day${day} ${i + 1}→${i + 2}`,
          meters: haversineMeters(from, to),
        };
      });
      const scheduleEdges = onDay.map((n) => ({
        id: `schedule_${n.id}_day${day}`,
        kind: "route" as const,
        fromId: n.id,
        toId: dayNodeId,
        labelKo: `Day${day} Draft`,
        meters: null as number | null,
      }));
      const totalMeters = routeEdges.reduce(
        (sum, e) => sum + (e.meters ?? 0),
        0,
      );
      const realityDraft =
        buildRealityDraft({
          contextTitleKo: live.summaryKo || live.query || "여행",
          destinationKo: live.realityDraft?.destinationKo ?? null,
          stayLabelKo: live.realityDraft?.stayLabelKo ?? null,
          nodes: live.nodes,
        }) ?? live.realityDraft ?? null;
      writeContextWorkspace({
        ...live,
        relationshipEdges: [...kept, ...scheduleEdges, ...routeEdges].slice(
          0,
          64,
        ),
        realityDraft,
        lastChangeKo:
          onDay.length > 0
            ? `Day${day} 동선 · ${onDay.length}곳${totalMeters > 0 ? ` · 약 ${Math.round(totalMeters / 1000)}km` : ""}`
            : `Day${day} 동선 다시 짜기`,
        updatedAtIso: new Date().toISOString(),
      });
      statusKo =
        onDay.length > 0
          ? `Day${day} 동선 · ${onDay.length}곳`
          : `Day${day} 동선 다시 짰어요`;
      break;
    }
    case "move_entity": {
      const live = readContextWorkspace(contextEventId);
      if (live && patch.lat != null && patch.lng != null) {
        writeContextWorkspace({
          ...live,
          nodes: live.nodes.map((n) =>
            n.id === patch.entityId || n.placeId === patch.entityId
              ? { ...n, lat: patch.lat!, lng: patch.lng! }
              : n,
          ),
          lastChangeKo: "Move Entity 패치",
          updatedAtIso: new Date().toISOString(),
        });
        statusKo = "Move Entity 패치";
      } else {
        statusKo = "Move Entity · 좌표 없음";
      }
      break;
    }
    case "update_entity": {
      statusKo = "Update Entity 패치";
      break;
    }
    case "create_draft": {
      statusKo = patch.labelKo?.slice(0, 40) ?? "Draft 생성 패치";
      break;
    }
    case "simulation": {
      applyWorkspaceTransition({
        contextEventId,
        op: "simulate",
        changeKo: patch.scenarioKo?.slice(0, 40) ?? "Simulation 패치",
      });
      statusKo = "Simulation 패치";
      break;
    }
    case "absorb_network": {
      statusKo =
        patch.labelKo?.trim() ||
        `네트워크 ${patch.lineCount}노선 · ${patch.providerId}`;
      if (patch.family && patch.visibilityOp) {
        const next = applyNetworkAbsorbVisibilityPatch({
          family: patch.family,
          op: patch.visibilityOp,
          lineIds: patch.lineIds ?? [],
          labelKo: patch.labelKo ?? statusKo,
          providerId: patch.providerId,
          needId: patch.needId,
        });
        const state = readContextWorkspace(contextEventId);
        if (state) {
          writeContextWorkspace({
            ...state,
            networkAbsorb: next,
            updatedAtIso: new Date().toISOString(),
          });
        }
      }
      break;
    }
    case "absorb_geometry": {
      statusKo = `${patch.labelKo} 영역 · ${patch.geometryType} · ${patch.providerId}`;
      break;
    }
    default: {
      statusKo = "알 수 없는 Patch";
      break;
    }
  }

  const record = makeRecord({ patch, utterance, statusKo });
  appendPatchRecord(contextEventId, record);

  // P1 — soft/spatial/replace Patch also stamps ConstraintMemory SSOT (Law 15).
  if (
    utterance?.trim() &&
    (patch.kind === "filter_entity" ||
      patch.kind === "spatial_constraint" ||
      patch.kind === "replace_entity")
  ) {
    rememberConstraintsOnWorkspace({
      contextEventId,
      utterance,
    });
  }

  // STEP 6 — Auto Projection (always; no user Refresh)
  if (!input.skipAutoProjection) {
    const focusIds =
      patch.kind === "delete_entity"
        ? []
        : readContextWorkspace(contextEventId)?.selectedIds ?? [];
    runAutoProjectionAfterPatch({
      contextEventId,
      patchRecord: record,
      entityIds: focusIds.length ? focusIds : null,
    });
  }

  return {
    ok: true,
    statusKo,
    record,
    needsRescout,
    scoutQuery,
  };
}
