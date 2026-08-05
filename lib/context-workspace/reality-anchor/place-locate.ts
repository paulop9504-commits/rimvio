/**
 * Place locate — 「X 어디야」→ Location Entity → Workspace Anchor Projection.
 * Chat = 1-line status; map selection flies to the place.
 *
 * Resolve order: world-geo / landmark → registry → Nominatim.
 * Does not steal domain Search (호텔·맛집·편의점 어디야).
 */

import {
  answerAdminDivisionQuestion,
  formatWorldGeoHierarchyKo,
} from "@/lib/reality-graph/answer-admin-division";
import {
  getWorldGeoNode,
  resolveWorldGeoById,
  resolveWorldGeoEntity,
} from "@/lib/reality-graph";
import { matchCatalogEntries } from "@/lib/entity-resolver/catalogs/match-catalog";
import { LANDMARK_CATALOG } from "@/lib/entity-resolver/catalogs/landmarks";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";
import { resolveLocationFromText } from "@/lib/location-engine";
import { isStreetAddressQuery } from "@/lib/location-engine/street-address-query";
import {
  resolveAddressLocateCandidates,
  type AddressLocateCandidate,
} from "@/lib/location-engine/resolve-address-candidates";
import {
  resolveRealityAnchorFromUtterance,
  type RealityAnchorHit,
} from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";
import { ensureWorkspaceAnchorNode } from "@/lib/context-workspace/reality-anchor/ensure-workspace-anchor-node";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { resolveActiveWorkspaceContextId } from "@/lib/context-run/resolve-active-workspace-context";
import type { SpatialAnchorResolved } from "@/lib/spatial-retrieval/types";
import { absorbPoiGeometryForPlace } from "@/lib/reality-provider/absorb-poi-geometry";
import type { WorkspaceChatObjectCard } from "@/lib/context-workspace/workspace-chat-store";

const WHERE_RE =
  /(?:어디야|어디에\s*있|어디\s*있|어디\s*가|위치가|위치\s*(?:알려|보여|어때)|어디에\s*위치|where(?:'s|\s+is)|locate)/iu;

const LOCATION_NOUN_RE = /(?:위치|좌표|지도에?\s*(?:보여|띄워|올려))/iu;

const SEARCH_STEAL_RE =
  /호텔|숙소|캡슐|료칸|맛집|레스토랑|카페|편의점|약국|병원|찾아\s*줘|추천해|근처\s*(?:숙소|호텔|맛집)|예약\s*준비/iu;

const STRIP_RE =
  /(?:어디야|어디에\s*있(?:어|나요|습니까)?|어디\s*있(?:어|나요)?|어디\s*가|위치가|위치\s*(?:알려|보여)(?:줘|주세요)?|어디에\s*위치|where(?:'s|\s+is)|locate|알려줘|보여줘|해줘|해바|해봐|해죠|좀|please|위치|좌표)/giu;

export type PlaceLocateHit = {
  readonly geoId: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly kind: RealityAnchorHit["kind"];
  readonly hierarchyKo: string;
  readonly provider: "reality_graph" | "landmark" | "registry" | "nominatim";
};

export type PlaceLocateApplyResult = {
  readonly handled: true;
  readonly statusKo: string;
  readonly contextEventId: string;
  readonly workspaceMutated: boolean;
  readonly openedWorkspace: boolean;
  /** Ambiguous address — chip list for user pick (same nodeId as map). */
  readonly objects?: readonly WorkspaceChatObjectCard[];
};

function expandWorkspace(contextEventId: string): void {
  writeContextWorkspaceExpanded(contextEventId, true);
  dispatchContextWorkspaceExpand({
    contextEventId,
    source: "nl_open",
  });
}

function kindFromWorldGeo(
  kind: string | undefined,
): RealityAnchorHit["kind"] {
  if (kind === "poi") return "poi";
  if (kind === "city" || kind === "metropolis") return "city";
  return "area";
}

/**
 * Pure place/landmark/address locate — not domain Search (호텔 어디야 …).
 */
export function isPlaceLocateUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (answerAdminDivisionQuestion(t)) return true;
  if (SEARCH_STEAL_RE.test(t)) return false;
  if (WHERE_RE.test(t) || LOCATION_NOUN_RE.test(t)) return true;
  const stripped = extractPlaceLocateQuery(t);
  return isStreetAddressQuery(t) || isStreetAddressQuery(stripped);
}

/** Strip where-is verbs → place query. */
export function extractPlaceLocateQuery(text: string): string {
  const admin = answerAdminDivisionQuestion(text);
  if (admin) return admin.hit.node.labels.ko;

  const stripped = text
    .trim()
    .replace(STRIP_RE, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return stripped || text.trim();
}

function hitFromWorldGeoText(query: string): PlaceLocateHit | null {
  const anchor = resolveRealityAnchorFromUtterance(query);
  if (anchor) {
    const graph = resolveWorldGeoEntity(query);
    return {
      geoId: anchor.geoId,
      labelKo: anchor.labelKo,
      lat: anchor.lat,
      lng: anchor.lng,
      kind: anchor.kind,
      hierarchyKo: graph
        ? formatWorldGeoHierarchyKo(graph)
        : anchor.labelKo,
      provider: "reality_graph",
    };
  }

  const graph = resolveWorldGeoEntity(query);
  if (
    graph?.node &&
    Number.isFinite(graph.node.centroid.lat) &&
    Number.isFinite(graph.node.centroid.lng)
  ) {
    return {
      geoId: graph.node.id,
      labelKo: graph.node.labels.ko,
      lat: graph.node.centroid.lat,
      lng: graph.node.centroid.lng,
      kind: kindFromWorldGeo(graph.node.kind),
      hierarchyKo: formatWorldGeoHierarchyKo(graph),
      provider: "reality_graph",
    };
  }
  return null;
}

function hitFromLandmarkCatalog(query: string): PlaceLocateHit | null {
  const matches = matchCatalogEntries(query, LANDMARK_CATALOG);
  const best = [...matches].sort((a, b) => b.confidence - a.confidence)[0];
  if (!best?.geoId) return null;
  const node = getWorldGeoNode(best.geoId as `geo:${string}`);
  if (
    !node ||
    !Number.isFinite(node.centroid.lat) ||
    !Number.isFinite(node.centroid.lng)
  ) {
    return null;
  }
  const graphHit = resolveWorldGeoById(node.id);
  return {
    geoId: node.id,
    labelKo: node.labels.ko || best.label,
    lat: node.centroid.lat,
    lng: node.centroid.lng,
    kind: "poi",
    hierarchyKo: graphHit
      ? formatWorldGeoHierarchyKo(graphHit)
      : node.labels.ko,
    provider: "landmark",
  };
}

function hitFromRegistry(query: string): PlaceLocateHit | null {
  const domestic = resolveRunPlaceFromText(query);
  if (domestic) {
    const graph = resolveWorldGeoEntity(domestic.placeLabel);
    return {
      geoId: graph?.node.id ?? `geo:reg:${domestic.placeLabel}`,
      labelKo: domestic.placeLabel,
      lat: domestic.lat,
      lng: domestic.lng,
      kind: "city",
      hierarchyKo: graph
        ? formatWorldGeoHierarchyKo(graph)
        : `대한민국 → ${domestic.placeLabel}`,
      provider: "registry",
    };
  }

  const overseas = classifyOverseasManualPlace(query);
  if (overseas) {
    const graph = resolveWorldGeoEntity(overseas.label);
    return {
      geoId: graph?.node.id ?? `geo:reg:${overseas.label}`,
      labelKo: overseas.label,
      lat: overseas.lat,
      lng: overseas.lng,
      kind: overseas.kind === "city" ? "city" : "area",
      hierarchyKo: graph
        ? formatWorldGeoHierarchyKo(graph)
        : `${overseas.countryLabel} → ${overseas.label}`,
      provider: "registry",
    };
  }
  return null;
}

/** Sync resolve — seed / landmark / registry (no network). */
export function resolvePlaceLocateSync(text: string): PlaceLocateHit | null {
  const query = extractPlaceLocateQuery(text);
  if (!query) return null;
  return (
    hitFromWorldGeoText(query) ??
    hitFromLandmarkCatalog(query) ??
    hitFromRegistry(query)
  );
}

/** Full resolve including Nominatim world fallback. */
export async function resolvePlaceLocate(
  text: string,
): Promise<PlaceLocateHit | null> {
  const sync = resolvePlaceLocateSync(text);
  if (sync) return sync;

  const query = extractPlaceLocateQuery(text);
  if (!query) return null;

  const resolved = await resolveLocationFromText(query);
  if (!resolved) return null;
  const { entity } = resolved;
  return {
    geoId: entity.id,
    labelKo: entity.labelKo,
    lat: entity.lat,
    lng: entity.lng,
    kind: entity.admin.city ? "city" : "poi",
    hierarchyKo: entity.hierarchyKo || entity.labelKo,
    provider:
      entity.provider === "nominatim" || entity.provider === "google"
        ? "nominatim"
        : "registry",
  };
}

function toSpatialAnchor(hit: PlaceLocateHit): SpatialAnchorResolved {
  return {
    entityId: hit.geoId,
    titleKo: hit.labelKo,
    labelKo: hit.labelKo,
    kind:
      hit.kind === "poi"
        ? "attraction"
        : hit.kind === "station"
          ? "station"
          : "place",
    lat: hit.lat,
    lng: hit.lng,
  };
}

function statusFromHit(hit: PlaceLocateHit, adminAnswer?: string | null): string {
  if (adminAnswer?.trim()) {
    const short = adminAnswer.trim().split(/\n+/u)[0] ?? adminAnswer;
    return short.length > 72 ? `${short.slice(0, 71).trimEnd()}…` : short;
  }
  const line =
    hit.hierarchyKo && hit.hierarchyKo !== hit.labelKo
      ? `${hit.labelKo} · ${hit.hierarchyKo}`
      : `${hit.labelKo} · 지도에 올렸어요`;
  return line.length > 72 ? `${line.slice(0, 71).trimEnd()}…` : line;
}

function hitFromAddressCandidate(
  c: AddressLocateCandidate,
): PlaceLocateHit {
  return {
    geoId: c.id,
    labelKo: c.labelKo,
    lat: c.lat,
    lng: c.lng,
    kind: "poi",
    hierarchyKo: c.subtitleKo || c.addressKo,
    provider: "nominatim",
  };
}

function ensureContextForLocate(input: {
  readonly contextEventId?: string | null;
  readonly query: string;
}): { contextEventId: string; openedWorkspace: boolean } {
  let contextEventId =
    resolveActiveWorkspaceContextId({
      explicitContextEventId: input.contextEventId ?? null,
    }) ?? null;
  let openedWorkspace = false;
  if (!contextEventId || !hasProvisionalContextWorkspace(contextEventId)) {
    contextEventId =
      input.contextEventId?.trim() || `place_${Date.now()}`;
    openMapContextWorkspace({
      contextEventId,
      domain: "poi",
      query: input.query,
      summaryKo: `${input.query} 위치`,
      candidates: [],
    });
    openedWorkspace = true;
  }
  return { contextEventId, openedWorkspace };
}

function applyAddressCandidatesToWorkspace(input: {
  readonly contextEventId: string;
  readonly query: string;
  readonly candidates: readonly AddressLocateCandidate[];
}): {
  readonly statusKo: string;
  readonly objects: readonly WorkspaceChatObjectCard[];
  readonly workspaceMutated: boolean;
} {
  const { contextEventId, query, candidates } = input;
  const next = applyWorkspaceTransition({
    contextEventId,
    op: "add_nodes",
    domain: "poi",
    addHits: candidates.map((c) => ({
      id: c.id,
      labelKo:
        candidates.length > 1
          ? `${c.labelKo} · ${c.subtitleKo}`
          : c.labelKo,
      domain: "poi" as const,
      lat: c.lat,
      lng: c.lng,
      rating: null,
      walkMinutes: null,
      reservable: false,
      localFavorite: false,
      priceBand: null,
      source: "maps" as const,
      reasonKo: c.addressKo,
      activitySubtype: "address_locate",
    })),
    changeKo:
      candidates.length > 1
        ? `주소 후보 ${candidates.length}곳 · 골라주세요`
        : `주소 · ${candidates[0]!.labelKo}`,
  });

  const objects: WorkspaceChatObjectCard[] = candidates.map((c) => {
    const node =
      next?.nodes.find(
        (n) =>
          n.placeId === c.id ||
          n.id.endsWith(c.id) ||
          n.id.includes(c.id.replace(/^geo:/u, "")),
      ) ?? null;
    return {
      nodeId: node?.id ?? `ws:poi:${c.id}`,
      title: c.labelKo,
      subtitleKo: c.subtitleKo,
      kind: "poi" as const,
      ctaKo: "이 위치 →",
    };
  });

  if (candidates.length === 1) {
    const only = candidates[0]!;
    ensureWorkspaceAnchorNode({
      contextEventId,
      anchor: toSpatialAnchor(hitFromAddressCandidate(only)),
      geoId: only.id,
      summaryKo: only.addressKo,
      mapOnlyLocate: true,
    });
    void absorbPoiGeometryForPlace({
      contextEventId,
      query: only.labelKo,
      labelKo: only.labelKo,
      geoId: only.id,
      lat: only.lat,
      lng: only.lng,
      utterance: query,
    }).catch(() => {});
  }

  expandWorkspace(contextEventId);

  const statusKo =
    candidates.length > 1
      ? `${query} · ${candidates.length}곳 후보 · 탭해서 골라주세요`
      : `${candidates[0]!.labelKo} · ${candidates[0]!.subtitleKo}`;

  return {
    statusKo: statusKo.length > 72 ? `${statusKo.slice(0, 71).trimEnd()}…` : statusKo,
    objects,
    workspaceMutated: Boolean(next),
  };
}

/**
 * User picked one address chip → keep that pin only, fly map, glow area.
 * No Object Place panel (Osaka-castle style Projection).
 */
export function applyAddressCandidateSelection(input: {
  readonly contextEventId: string;
  readonly nodeId: string;
  readonly siblingNodeIds?: readonly string[];
}): { readonly statusKo: string; readonly lat: number; readonly lng: number; readonly labelKo: string; readonly geoId: string } | null {
  const contextEventId = input.contextEventId.trim();
  const nodeId = input.nodeId.trim();
  if (!contextEventId || !nodeId) return null;

  const state = readContextWorkspace(contextEventId);
  if (!state) return null;
  const node =
    state.nodes.find((n) => n.id === nodeId || n.placeId === nodeId) ?? null;
  if (
    !node ||
    !Number.isFinite(node.lat) ||
    !Number.isFinite(node.lng)
  ) {
    return null;
  }

  const siblings = (input.siblingNodeIds ?? []).filter(
    (id) => id && id !== node.id && id !== node.placeId,
  );
  if (siblings.length > 0) {
    applyWorkspaceTransition({
      contextEventId,
      op: "remove",
      nodeIds: siblings,
      changeKo: "주소 후보 정리",
    });
  }

  applyWorkspaceTransition({
    contextEventId,
    op: "select",
    nodeIds: [node.id],
    changeKo: `위치 · ${node.title}`,
  });

  ensureWorkspaceAnchorNode({
    contextEventId,
    anchor: {
      entityId: node.placeId || node.id,
      titleKo: node.title,
      labelKo: node.title,
      kind: "place",
      lat: node.lat,
      lng: node.lng,
    },
    geoId: node.placeId || node.id,
    summaryKo: node.summaryKo,
    mapOnlyLocate: true,
  });

  expandWorkspace(contextEventId);

  void absorbPoiGeometryForPlace({
    contextEventId,
    query: node.title,
    labelKo: node.title,
    geoId: node.placeId || node.id,
    lat: node.lat,
    lng: node.lng,
    utterance: node.title,
  }).catch(() => {});

  const statusKo = `${node.title} · 지도에 올렸어요`;
  return {
    statusKo: statusKo.length > 72 ? `${statusKo.slice(0, 71).trimEnd()}…` : statusKo,
    lat: node.lat,
    lng: node.lng,
    labelKo: node.title,
    geoId: node.placeId || node.id,
  };
}

/**
 * Apply place locate: mint/open Workspace → Anchor node → expand → status.
 * Returns null when utterance is not a place-locate question.
 */
export async function tryApplyPlaceLocateFromUtterance(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): Promise<PlaceLocateApplyResult | null> {
  const utterance = input.utterance.trim();
  if (!utterance || !isPlaceLocateUtterance(utterance)) return null;

  const admin = answerAdminDivisionQuestion(utterance);
  const query = extractPlaceLocateQuery(utterance);

  // Street / parcel address (KR · JP · CN · US · …) — multi-candidate when ambiguous
  if (isStreetAddressQuery(query) || isStreetAddressQuery(utterance)) {
    const candidates = await resolveAddressLocateCandidates({
      query,
      lat: input.lat,
      lng: input.lng,
    });
    if (candidates.length === 0) {
      const ctx =
        resolveActiveWorkspaceContextId({
          explicitContextEventId: input.contextEventId ?? null,
        }) ?? `place_${Date.now()}`;
      return {
        handled: true,
        statusKo: "주소를 못 찾았어요 · 도시·구를 더 붙여 주세요",
        contextEventId: ctx,
        workspaceMutated: false,
        openedWorkspace: false,
      };
    }
    const { contextEventId, openedWorkspace } = ensureContextForLocate({
      contextEventId: input.contextEventId,
      query,
    });
    const applied = applyAddressCandidatesToWorkspace({
      contextEventId,
      query,
      candidates,
    });
    return {
      handled: true,
      statusKo: applied.statusKo,
      contextEventId,
      workspaceMutated: applied.workspaceMutated,
      openedWorkspace,
      objects: applied.objects,
    };
  }

  const hit = await resolvePlaceLocate(utterance);
  if (!hit) {
    const ctx =
      resolveActiveWorkspaceContextId({
        explicitContextEventId: input.contextEventId ?? null,
      }) ?? `place_${Date.now()}`;
    return {
      handled: true,
      statusKo: "위치를 못 찾았어요 · 지명을 다시 말해 주세요",
      contextEventId: ctx,
      workspaceMutated: false,
      openedWorkspace: false,
    };
  }

  const { contextEventId, openedWorkspace } = ensureContextForLocate({
    contextEventId: input.contextEventId,
    query: hit.labelKo,
  });

  const nodeId = ensureWorkspaceAnchorNode({
    contextEventId,
    anchor: toSpatialAnchor(hit),
    geoId: hit.geoId,
    summaryKo: `${hit.labelKo} 위치`,
    mapOnlyLocate: true,
  });

  expandWorkspace(contextEventId);

  void absorbPoiGeometryForPlace({
    contextEventId,
    query: hit.labelKo,
    labelKo: hit.labelKo,
    geoId: hit.geoId,
    lat: hit.lat,
    lng: hit.lng,
    utterance,
  }).catch(() => {
    /* fail-closed: pin stays without glow */
  });

  return {
    handled: true,
    statusKo: statusFromHit(hit, admin?.answerKo),
    contextEventId,
    workspaceMutated: Boolean(nodeId),
    openedWorkspace,
  };
}

/**
 * Sync-only apply (world-geo / landmark / registry). No Nominatim.
 */
export function tryApplyPlaceLocateFromUtteranceSync(input: {
  readonly utterance: string;
  readonly contextEventId: string;
}): PlaceLocateApplyResult | null {
  const utterance = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!utterance || !contextEventId || !isPlaceLocateUtterance(utterance)) {
    return null;
  }

  const admin = answerAdminDivisionQuestion(utterance);
  const hit = resolvePlaceLocateSync(utterance);
  if (!hit) {
    // Unknown object — Nominatim / Wikipedia need async Acquire.
    // Never fail-closed here or NL sync path blocks world providers.
    return null;
  }

  if (!hasProvisionalContextWorkspace(contextEventId)) {
    openMapContextWorkspace({
      contextEventId,
      domain: "poi",
      query: hit.labelKo,
      summaryKo: `${hit.labelKo} 위치`,
      candidates: [],
    });
  }

  const nodeId = ensureWorkspaceAnchorNode({
    contextEventId,
    anchor: toSpatialAnchor(hit),
    geoId: hit.geoId,
    summaryKo: `${hit.labelKo} 위치`,
    mapOnlyLocate: true,
  });
  expandWorkspace(contextEventId);

  void absorbPoiGeometryForPlace({
    contextEventId,
    query: hit.labelKo,
    labelKo: hit.labelKo,
    geoId: hit.geoId,
    lat: hit.lat,
    lng: hit.lng,
    utterance,
  }).catch(() => {
    /* fail-closed */
  });

  return {
    handled: true,
    statusKo: statusFromHit(hit, admin?.answerKo),
    contextEventId,
    workspaceMutated: Boolean(nodeId),
    openedWorkspace: false,
  };
}
