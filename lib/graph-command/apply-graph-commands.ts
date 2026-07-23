/**
 * Graph Projector (L3) — apply GraphCommand IR to session graph + prepare-only Inbox.
 * Never auto-Commits.
 */

import { parseGraphCommands } from "@/lib/graph-command/parse-graph-commands";
import { resolveGraphEntity } from "@/lib/graph-command/resolve-graph-entity";
import { shouldDeferSearchProjectToDiscoveryScout } from "@/lib/graph-command/should-defer-search-project-to-scout";
import {
  ensureSessionGraph,
  writeSessionGraph,
} from "@/lib/graph-command/session-graph-store";
import type {
  GraphCommand,
  GraphCommandApplyResult,
  GraphEntityDomain,
  GraphEntityRef,
  GraphPinAccent,
  SessionGraphEdge,
  SessionGraphNode,
  SessionGraphNodeKind,
  SessionGraphV1,
} from "@/lib/graph-command/types";
import { openPlaceActionGraphWithPipeline } from "@/lib/globe/entity-explore/run-place-action-pipeline";
import { isOsakaDemoTheaterActive } from "@/lib/globe/osaka-demo/osaka-demo-theater";
import { entityFromBrainCandidate } from "@/lib/globe/entity-explore/open-place-explore-session";
import { resolveLodgingLiteApiOfferForPrep } from "@/lib/booking-runtime/resolve-lodging-liteapi-offer";
import { runBookingPrepareAgent } from "@/lib/agent-runtime/run-booking-prepare-agent";
import { stampRealityObjectOntoSessionNode } from "@/lib/reality-object/stamp-graph-node-object";
import { enqueuePaymentPrepOperation } from "@/lib/reality-queue/enqueue-payment-prep-operation";
import {
  isBareApaBrandLabel,
  matchApaBranchLabel,
  OSAKA_APA_BRANCHES,
  OSAKA_APA_NAMBA,
} from "@/lib/search-engine/osaka-demo-catalog";
import {
  invokeRimvioTool,
  invokeRimvioToolAsync,
} from "@/lib/tool-registry/invoke-rimvio-tool";
import { resolveLookupToolId } from "@/lib/rule-engine/resolve-tool-id";
import {
  stampSearchToolResultsToDiff,
  toolCandidatesToPlaceHits,
} from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import { emitToolSearchHubAction } from "@/lib/graph-command/emit-tool-search-hub-action";
import { resolveLodgingStayForTools } from "@/lib/context-builder/resolve-lodging-stay-for-tools";
import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { hasProvisionalContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

function slug(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/\s+/gu, "-")
      .replace(/[^\w\uac00-\ud7a3-]+/gu, "")
      .slice(0, 32) || "node"
  );
}

function orbit(input: {
  lat: number;
  lng: number;
  index: number;
  radiusKm: number;
}): { lat: number; lng: number } {
  const angle = 35 + input.index * 52;
  const rad = (angle * Math.PI) / 180;
  const latOffset = (input.radiusKm / 111) * Math.cos(rad);
  const lngScale = Math.max(0.25, Math.cos((input.lat * Math.PI) / 180));
  const lngOffset = (input.radiusKm / (111 * lngScale)) * Math.sin(rad);
  return { lat: input.lat + latOffset, lng: input.lng + lngOffset };
}

function makeNode(input: {
  id: string;
  labelKo: string;
  kind: SessionGraphNodeKind;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  walkMinutes?: number | null;
  reservable?: boolean;
  localFavorite?: boolean;
  priceBand?: number | null;
  pinned?: boolean;
  visible?: boolean;
  alwaysVisible?: boolean;
  parentId?: string | null;
  groupId?: string | null;
  accent?: GraphPinAccent;
  projectFolderKo?: string | null;
  attrs?: Readonly<Record<string, string | number | boolean | null>>;
}): SessionGraphNode {
  return {
    id: input.id,
    labelKo: input.labelKo,
    kind: input.kind,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    rating: input.rating ?? null,
    walkMinutes: input.walkMinutes ?? null,
    reservable: input.reservable ?? false,
    localFavorite: input.localFavorite ?? false,
    priceBand: input.priceBand ?? null,
    pinned: input.pinned ?? false,
    visible: input.visible ?? true,
    alwaysVisible: input.alwaysVisible ?? false,
    parentId: input.parentId ?? null,
    groupId: input.groupId ?? null,
    accent: input.accent ?? "default",
    projectFolderKo: input.projectFolderKo ?? null,
    attrs: input.attrs ?? {},
  };
}

function resolveNode(
  graph: SessionGraphV1,
  ref: GraphEntityRef,
): SessionGraphNode | null {
  if (ref.nodeId) {
    const byId = graph.nodes.find((n) => n.id === ref.nodeId);
    if (byId) {
      return byId;
    }
  }
  return resolveGraphEntity({ labelKo: ref.labelKo, graph }).node;
}

function searchHitAttrs(
  hit: import("@/lib/search-engine/run-place-search").PlaceSearchHit,
  query: string,
  extra?: Readonly<Record<string, string | number | boolean | null>>,
): Readonly<Record<string, string | number | boolean | null>> {
  const attrs: Record<string, string | number | boolean | null> = {
    query,
    searchId: hit.id,
    source: hit.source,
    ...(extra ?? {}),
  };
  if (hit.id.startsWith("maps:")) {
    attrs.googlePlaceId = hit.id.slice("maps:".length);
  }
  if (hit.id.startsWith("liteapi:")) {
    attrs.liteapiHotelId = hit.id.slice("liteapi:".length);
  }
  if (hit.liteapiHotelId) {
    attrs.liteapiHotelId = hit.liteapiHotelId;
  }
  if (hit.liteapiOfferId) {
    attrs.liteapiOfferId = hit.liteapiOfferId;
  }
  if (hit.amountLabel) {
    attrs.amountLabel = hit.amountLabel;
  }
  return attrs;
}

function tripFrameAttrs(
  command: Extract<GraphCommand, { op: "search_project" }>,
  index: number,
): Record<string, string | number | boolean | null> {
  const attrs: Record<string, string | number | boolean | null> = {
    isMain: index === 0,
  };
  if (command.planDayIndex != null && command.planDayIndex >= 1) {
    attrs.planDayIndex = command.planDayIndex;
  }
  if (command.planNights != null && command.planNights >= 1) {
    attrs.planNights = command.planNights;
  }
  if (command.destinationLabelKo?.trim()) {
    attrs.destinationLabelKo = command.destinationLabelKo.trim();
  }
  return attrs;
}

function ensureDestinationAnchor(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "search_project" }>,
): SessionGraphV1 {
  const label = command.destinationLabelKo?.trim();
  if (!label) {
    return graph;
  }
  const hit = resolveWorldGeoEntity(label);
  if (!hit?.node.centroid) {
    return graph;
  }
  const { lat, lng } = hit.node.centroid;
  const anchorId = `gnode:${graph.contextEventId}:anchor:${slug(label)}`;
  const existing = graph.nodes.find(
    (n) =>
      n.id === anchorId ||
      (n.kind === "anchor" && n.labelKo === hit.node.labels.ko),
  );
  const anchorNode =
    existing ??
    makeNode({
      id: anchorId,
      labelKo: hit.node.labels.ko,
      kind: "anchor",
      lat,
      lng,
      alwaysVisible: true,
      accent: "blue",
      attrs: {
        destinationLabelKo: hit.node.labels.ko,
        ...(command.planNights != null ? { planNights: command.planNights } : {}),
      },
    });
  const nodes = existing
    ? graph.nodes.map((n) =>
        n.id === existing.id
          ? {
              ...n,
              lat,
              lng,
              attrs: {
                ...n.attrs,
                ...(command.planNights != null
                  ? { planNights: command.planNights }
                  : {}),
              },
            }
          : n,
      )
    : [...graph.nodes, anchorNode];
  return {
    ...graph,
    nodes,
    anchorLat: lat,
    anchorLng: lng,
    updatedAtIso: new Date().toISOString(),
  };
}

function worldGeoSeedHitsForQuery(
  query: string,
  domain: GraphEntityDomain,
): PlaceSearchHit[] {
  const hit = resolveWorldGeoEntity(query);
  if (!hit?.node.centroid || hit.node.kind !== "poi") {
    return [];
  }
  return [
    {
      id: `seed:${hit.node.id}`,
      labelKo: hit.node.labels.ko,
      domain,
      lat: hit.node.centroid.lat,
      lng: hit.node.centroid.lng,
      rating: null,
      walkMinutes: null,
      reservable: domain === "lodging" || domain === "poi",
      localFavorite: false,
      priceBand: null,
      source: "seed",
    },
  ];
}

function mergeSearchProjectIntoGraph(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "search_project" }>,
  hits: readonly import("@/lib/search-engine/run-place-search").PlaceSearchHit[],
): SessionGraphV1 {
  const withDest = ensureDestinationAnchor(graph, command);
  const anchorNode = command.anchorRef
    ? resolveNode(withDest, command.anchorRef)
    : withDest.nodes.find((n) => n.kind === "anchor") ?? null;
  const parentId = anchorNode?.id ?? null;
  const newNodes: SessionGraphNode[] = hits.map((hit, index) => {
    let nodeId = `gnode:${withDest.contextEventId}:${command.domain}:${slug(hit.labelKo)}:${index}`;
    if (hit.id.startsWith("maps:") && hit.id.length > 10) {
      nodeId = `gnode:${withDest.contextEventId}:${command.domain}:${hit.id.slice("maps:".length).slice(0, 24)}`;
    } else if (hit.id.startsWith("liteapi:") && hit.id.length > 10) {
      nodeId = `gnode:${withDest.contextEventId}:${command.domain}:${hit.id.slice("liteapi:".length).slice(0, 24)}`;
    } else if (hit.id.startsWith("seed:") && hit.id.length > 6) {
      nodeId = `gnode:${withDest.contextEventId}:${command.domain}:${hit.id.slice("seed:".length).slice(0, 32)}`;
    }
    const raw = makeNode({
      id: nodeId,
      labelKo: hit.labelKo,
      kind: command.domain,
      lat: hit.lat,
      lng: hit.lng,
      rating: hit.rating,
      walkMinutes: hit.walkMinutes,
      reservable: hit.reservable,
      localFavorite: hit.localFavorite,
      priceBand: hit.priceBand,
      parentId,
      accent: index === 0 ? "orange" : "default",
      attrs: searchHitAttrs(hit, command.query, tripFrameAttrs(command, index)),
    });
    // Tool result → Graph IR Diff node owns a Reality Object (session working set).
    return stampRealityObjectOntoSessionNode({
      contextEventId: withDest.contextEventId,
      node: raw,
    });
  });

  const edges: SessionGraphEdge[] = parentId
    ? newNodes.map((node) => ({
        id: `gedge:${parentId}:${node.id}`,
        fromId: parentId,
        toId: node.id,
        kind: "nearby" as const,
        labelKo: "근처",
      }))
    : [];

  const kept = withDest.nodes.filter(
    (n) =>
      n.pinned ||
      n.alwaysVisible ||
      n.kind === "compare" ||
      n.kind === "anchor" ||
      n.kind === "group" ||
      n.kind === "note" ||
      n.kind === "simulation" ||
      (n.kind !== command.domain && n.parentId !== parentId),
  );

  return {
    ...withDest,
    nodes: [...kept, ...newNodes],
    edges: [
      ...withDest.edges.filter((e) =>
        kept.some((n) => n.id === e.toId || n.id === e.fromId),
      ),
      ...edges,
    ],
    selectionIds: newNodes[0] ? [newNodes[0].id] : [],
    updatedAtIso: new Date().toISOString(),
  };
}

function applySearchProject(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "search_project" }>,
): SessionGraphV1 {
  const seeded = ensureDestinationAnchor(graph, command);
  const anchorNode = command.anchorRef
    ? resolveNode(seeded, command.anchorRef)
    : seeded.nodes.find((n) => n.kind === "anchor") ?? null;
  const baseLat = anchorNode?.lat ?? seeded.anchorLat ?? 36.3621;
  const baseLng = anchorNode?.lng ?? seeded.anchorLng ?? 127.3446;

  const toolId = resolveLookupToolId(
    command.domain === "eatery"
      ? "eatery"
      : command.domain === "poi"
        ? "poi"
        : "lodging",
    command.query,
  );
  const toolResult = invokeRimvioTool(toolId, {
    query: command.query,
    domain: command.domain,
    lat: baseLat,
    lng: baseLng,
    utterance: command.query,
    contextEventId: seeded.contextEventId,
  });
  let hits = toolCandidatesToPlaceHits(
    command.domain,
    toolResult.candidates,
  );
  if (hits.length === 0) {
    hits = worldGeoSeedHitsForQuery(command.query, command.domain);
  }
  // Map Search → Context Workspace (Globe stamp deferred to Commit).
  if (
    command.domain === "lodging" ||
    command.domain === "eatery" ||
    command.domain === "poi"
  ) {
    openMapContextWorkspace({
      contextEventId: seeded.contextEventId,
      domain: command.domain,
      query: command.query,
      summaryKo: toolResult.summaryKo,
      hits,
      candidates: toolResult.candidates,
      source: "map_search",
    });
    emitToolSearchHubAction({
      contextEventId: seeded.contextEventId,
      toolId,
      domain: command.domain,
      query: command.query,
      candidateCount: Math.max(
        toolResult.candidates?.length ?? 0,
        hits.length,
      ),
    });
    return ensureDestinationAnchor(seeded, command);
  }
  const next = mergeSearchProjectIntoGraph(seeded, command, hits);
  stampSearchToolResultsToDiff({
    contextEventId: seeded.contextEventId,
    domain: command.domain,
    query: command.query,
    candidates: toolResult.candidates?.length
      ? toolResult.candidates
      : hits.map((h) => ({
          id: h.id,
          labelKo: h.labelKo,
          lat: h.lat,
          lng: h.lng,
          source: h.source,
        })),
    summaryKo: toolResult.summaryKo,
  });
  emitToolSearchHubAction({
    contextEventId: seeded.contextEventId,
    toolId,
    domain: command.domain,
    query: command.query,
    candidateCount: Math.max(
      toolResult.candidates?.length ?? 0,
      hits.length,
    ),
  });
  return next;
}

async function applySearchProjectAsync(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "search_project" }>,
): Promise<SessionGraphV1> {
  const seeded = ensureDestinationAnchor(graph, command);
  const anchorNode = command.anchorRef
    ? resolveNode(seeded, command.anchorRef)
    : seeded.nodes.find((n) => n.kind === "anchor") ?? null;
  const baseLat = anchorNode?.lat ?? seeded.anchorLat ?? 36.3621;
  const baseLng = anchorNode?.lng ?? seeded.anchorLng ?? 127.3446;

  const toolId = resolveLookupToolId(
    command.domain === "eatery"
      ? "eatery"
      : command.domain === "poi"
        ? "poi"
        : "lodging",
    command.query,
  );
  const toolResult = await invokeRimvioToolAsync(toolId, {
    query: command.query,
    domain: command.domain,
    lat: baseLat,
    lng: baseLng,
    utterance: command.query,
    contextEventId: seeded.contextEventId,
  });
  let hits = toolCandidatesToPlaceHits(
    command.domain,
    toolResult.candidates,
  );
  if (hits.length === 0) {
    hits = worldGeoSeedHitsForQuery(command.query, command.domain);
  }
  if (
    command.domain === "lodging" ||
    command.domain === "eatery" ||
    command.domain === "poi"
  ) {
    openMapContextWorkspace({
      contextEventId: seeded.contextEventId,
      domain: command.domain,
      query: command.query,
      summaryKo: toolResult.summaryKo,
      hits,
      candidates: toolResult.candidates,
      source: "map_search",
    });
    emitToolSearchHubAction({
      contextEventId: seeded.contextEventId,
      toolId,
      domain: command.domain,
      query: command.query,
      candidateCount: Math.max(
        toolResult.candidates?.length ?? 0,
        hits.length,
      ),
    });
    return ensureDestinationAnchor(seeded, command);
  }
  const next = mergeSearchProjectIntoGraph(seeded, command, hits);
  stampSearchToolResultsToDiff({
    contextEventId: seeded.contextEventId,
    domain: command.domain,
    query: command.query,
    candidates: toolResult.candidates?.length
      ? toolResult.candidates
      : hits.map((h) => ({
          id: h.id,
          labelKo: h.labelKo,
          lat: h.lat,
          lng: h.lng,
          source: h.source,
        })),
    summaryKo: toolResult.summaryKo,
  });
  emitToolSearchHubAction({
    contextEventId: seeded.contextEventId,
    toolId,
    domain: command.domain,
    query: command.query,
    candidateCount: Math.max(
      toolResult.candidates?.length ?? 0,
      hits.length,
    ),
  });
  return next;
}

function applyFilter(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "filter" }>,
): SessionGraphV1 {
  const pred = { ...graph.activeFilters, ...command.predicate };
  let nodes = graph.nodes.map((node) => {
    if (
      node.kind === "compare" ||
      node.kind === "anchor" ||
      node.kind === "group" ||
      node.kind === "note" ||
      node.kind === "simulation" ||
      node.alwaysVisible
    ) {
      return { ...node, visible: true };
    }
    let visible = true;
    if (pred.domain && pred.domain !== "all" && node.kind !== pred.domain) {
      visible = false;
    }
    if (
      pred.minRating != null &&
      (node.rating == null || node.rating < pred.minRating)
    ) {
      visible = false;
    }
    if (
      pred.maxWalkMinutes != null &&
      (node.walkMinutes == null || node.walkMinutes > pred.maxWalkMinutes)
    ) {
      visible = false;
    }
    if (pred.reservableOnly && !node.reservable) {
      visible = false;
    }
    if (pred.localFavoriteOnly && !node.localFavorite) {
      visible = false;
    }
    return { ...node, visible };
  });

  if (pred.sortBy === "price_asc") {
    nodes = [...nodes].sort(
      (a, b) => (a.priceBand ?? 99) - (b.priceBand ?? 99),
    );
  } else if (pred.sortBy === "rating_desc") {
    nodes = [...nodes].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (pred.sortBy === "walk_asc") {
    nodes = [...nodes].sort(
      (a, b) => (a.walkMinutes ?? 99) - (b.walkMinutes ?? 99),
    );
  } else if (pred.sortBy === "local_desc") {
    nodes = [...nodes].sort((a, b) => {
      const local = Number(b.localFavorite) - Number(a.localFavorite);
      if (local !== 0) {
        return local;
      }
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }

  return {
    ...graph,
    nodes,
    activeFilters: pred,
    updatedAtIso: new Date().toISOString(),
  };
}

function applyPin(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "pin_node" }>,
  contextLabelKo: string | null,
): SessionGraphV1 {
  const label = command.targetRef.labelKo.trim();
  const apaBranch = matchApaBranchLabel(label);
  const bareApa = isBareApaBrandLabel(label);

  // APA brand without branch → pin Namba + Umeda with real Osaka coords (demo feel).
  if (bareApa || (apaBranch && /apa|아파/iu.test(label) && !command.targetRef.nodeId)) {
    const branches =
      bareApa || !apaBranch ? [...OSAKA_APA_BRANCHES] : [apaBranch];
    let next = graph;
    const pinnedIds: string[] = [];
    for (const branch of branches) {
      const existing = next.nodes.find(
        (n) =>
          n.id === branch.id ||
          n.labelKo === branch.labelKo ||
          n.attrs?.catalogId === branch.id,
      );
      const node =
        existing ??
        makeNode({
          id: `gnode:${next.contextEventId}:pin:${slug(branch.labelKo)}`,
          labelKo: branch.labelKo,
          kind: "lodging",
          lat: branch.lat,
          lng: branch.lng,
          rating: branch.rating,
          walkMinutes: branch.walkMinutesFromNamba,
          reservable: branch.reservable,
          localFavorite: branch.localFavorite,
          priceBand: branch.priceBand,
          pinned: true,
          visible: true,
          attrs: { catalogId: branch.id, brand: "APA" },
        });
      if (!existing) {
        next = { ...next, nodes: [...next.nodes, node] };
      }
      pinnedIds.push(node.id);
      next = {
        ...next,
        nodes: next.nodes.map((n) => {
          if (n.id !== node.id) {
            return n;
          }
          const pinned = {
            ...n,
            pinned: true,
            visible: true,
            lat: branch.lat,
            lng: branch.lng,
            kind: "lodging" as const,
            reservable: true,
          };
          return stampRealityObjectOntoSessionNode({
            contextEventId: next.contextEventId,
            node: pinned,
          });
        }),
        anchorLat: OSAKA_APA_NAMBA.lat,
        anchorLng: OSAKA_APA_NAMBA.lng,
        selectionIds: [pinnedIds[0] ?? node.id],
        updatedAtIso: new Date().toISOString(),
      };
    }

    const primary = next.nodes.find((n) => n.id === pinnedIds[0]);
    if (
      primary?.lat != null &&
      primary.lng != null &&
      !isOsakaDemoTheaterActive()
    ) {
      openPlaceActionGraphWithPipeline({
        entity: entityFromBrainCandidate({
          placeId: primary.id,
          titleKo: primary.labelKo,
          lat: primary.lat,
          lng: primary.lng,
          contextEventId: next.contextEventId,
          contextLabelKo,
        }),
      });
    }
    return next;
  }

  let node = resolveNode(graph, command.targetRef);
  if (!node) {
    const catalogHit = apaBranch;
    const lat = catalogHit?.lat ?? graph.anchorLat ?? 36.3621;
    const lng = catalogHit?.lng ?? graph.anchorLng ?? 127.3446;
    node = makeNode({
      id: `gnode:${graph.contextEventId}:pin:${slug(command.targetRef.labelKo)}`,
      labelKo: catalogHit?.labelKo ?? command.targetRef.labelKo,
      kind: catalogHit ? "lodging" : "poi",
      lat,
      lng,
      rating: catalogHit?.rating ?? null,
      reservable: catalogHit?.reservable ?? false,
      localFavorite: catalogHit?.localFavorite ?? false,
      priceBand: catalogHit?.priceBand ?? null,
      pinned: true,
      visible: true,
      attrs: catalogHit ? { catalogId: catalogHit.id } : {},
    });
    graph = {
      ...graph,
      nodes: [...graph.nodes, node],
      ...(catalogHit
        ? { anchorLat: catalogHit.lat, anchorLng: catalogHit.lng }
        : {}),
    };
  }

  const nodes = graph.nodes.map((n) => {
    if (n.id !== node!.id) {
      return n;
    }
    return stampRealityObjectOntoSessionNode({
      contextEventId: graph.contextEventId,
      node: { ...n, pinned: true, visible: true },
    });
  });

  if (node.lat != null && node.lng != null && !isOsakaDemoTheaterActive()) {
    openPlaceActionGraphWithPipeline({
      entity: entityFromBrainCandidate({
        placeId: node.id,
        titleKo: node.labelKo,
        lat: node.lat,
        lng: node.lng,
        contextEventId: graph.contextEventId,
        contextLabelKo,
      }),
    });
  }

  return {
    ...graph,
    nodes,
    selectionIds: [node.id],
    updatedAtIso: new Date().toISOString(),
  };
}

function applyCompare(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "compare" }>,
): SessionGraphV1 {
  let left = resolveNode(graph, command.leftRef);
  let right = resolveNode(graph, command.rightRef);
  const ensure = (ref: GraphEntityRef, index: number): SessionGraphNode => {
    const existing = resolveNode(graph, ref);
    if (existing) {
      return existing;
    }
    const coords = orbit({
      lat: graph.anchorLat ?? 36.3621,
      lng: graph.anchorLng ?? 127.3446,
      index,
      radiusKm: 0.4,
    });
    return makeNode({
      id: `gnode:${graph.contextEventId}:cmp:${slug(ref.labelKo)}`,
      labelKo: ref.labelKo,
      kind: "lodging",
      lat: coords.lat,
      lng: coords.lng,
      rating: 4.2,
      walkMinutes: 8,
      reservable: true,
      priceBand: 2,
    });
  };
  left = left ?? ensure(command.leftRef, 0);
  right = right ?? ensure(command.rightRef, 1);

  const compareId = `gnode:${graph.contextEventId}:compare:${slug(left.labelKo)}-${slug(right.labelKo)}`;
  const compareNode = makeNode({
    id: compareId,
    labelKo: `${left.labelKo} ↔ ${right.labelKo}`,
    kind: "compare",
    attrs: {
      price: "가격",
      distance: "거리",
      rating: "평점",
      breakfast: "조식",
      checkin: "체크인",
      reservable: "예약 가능",
    },
  });

  const withoutOldCompare = graph.nodes.filter((n) => n.kind !== "compare");
  const ids = new Set(withoutOldCompare.map((n) => n.id));
  const nodes = [...withoutOldCompare];
  if (!ids.has(left.id)) {
    nodes.push(left);
  }
  if (!ids.has(right.id)) {
    nodes.push(right);
  }
  nodes.push(compareNode);

  const edges: SessionGraphEdge[] = [
    ...graph.edges.filter((e) => e.kind !== "compare"),
    {
      id: `gedge:${compareId}:${left.id}`,
      fromId: left.id,
      toId: compareId,
      kind: "compare",
      labelKo: "비교",
    },
    {
      id: `gedge:${compareId}:${right.id}`,
      fromId: right.id,
      toId: compareId,
      kind: "compare",
      labelKo: "비교",
    },
  ];

  return {
    ...graph,
    nodes,
    edges,
    compareClusterId: compareId,
    selectionIds: [left.id, right.id],
    updatedAtIso: new Date().toISOString(),
  };
}

function applyReservePrep(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "reserve_prep" }>,
  contextLabelKo: string | null,
  liteapiOffer?: {
    liteapiOfferId: string | null;
    amountLabel: string | null;
  } | null,
): { graph: SessionGraphV1; opId: string | null } {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return { graph, opId: null };
  }
  const kind =
    node.kind === "lodging"
      ? "lodging"
      : node.kind === "eatery"
        ? "eatery"
        : "activity";
  const googlePlaceId =
    typeof node.attrs.googlePlaceId === "string"
      ? node.attrs.googlePlaceId
      : typeof node.attrs.searchId === "string" &&
          node.attrs.searchId.startsWith("maps:")
        ? node.attrs.searchId.slice("maps:".length)
        : null;
  const nodeLiteOffer =
    typeof node.attrs.liteapiOfferId === "string"
      ? node.attrs.liteapiOfferId.trim()
      : null;
  const offerId = liteapiOffer?.liteapiOfferId ?? nodeLiteOffer;
  const amountLabel =
    liteapiOffer?.amountLabel ??
    (typeof node.attrs.amountLabel === "string" ? node.attrs.amountLabel : null);
  const sourceRef =
    typeof node.attrs.searchId === "string" &&
    (node.attrs.searchId.startsWith("maps:") ||
      node.attrs.searchId.startsWith("liteapi:"))
      ? node.attrs.searchId
      : googlePlaceId
        ? `maps:${googlePlaceId}`
        : node.id;
  // Agent Runtime SSOT — Tool Registry + Execution Inbox (offerId end-to-end).
  const stay = resolveLodgingStayForTools(graph.contextEventId);
  const prepared = runBookingPrepareAgent({
    contextEventId: graph.contextEventId,
    contextLabelKo,
    placeId: sourceRef,
    placeName: node.labelKo,
    kind,
    partySize: stay.guestCount,
    reserveAtLabelKo: "19:00",
    reasonLinesKo: [
      "그래프 명령 · 예약 준비",
      node.attrs.source === "maps" ? "Google Maps" : "",
      node.attrs.source === "liteapi" || offerId ? "LiteAPI 요금 확인" : "",
      stay.checkInIso && stay.checkOutIso
        ? `${stay.checkInIso.slice(0, 10)}→${stay.checkOutIso.slice(0, 10)} · ${stay.guestCount}명`
        : `${stay.guestCount}명`,
    ].filter(Boolean),
    lat: node.lat,
    lng: node.lng,
    googlePlaceId,
    liteapiOfferId: offerId,
    amountLabel,
    bookingProvider: offerId ? "liteapi_booking" : null,
  });
  if (!prepared.ok) {
    return { graph, opId: null };
  }
  const stamped = stampRealityObjectOntoSessionNode({
    contextEventId: graph.contextEventId,
    node: {
      ...node,
      attrs: {
        ...node.attrs,
        ...(offerId ? { liteapiOfferId: offerId } : {}),
        ...(amountLabel ? { amountLabel } : {}),
      },
    },
  });
  return {
    graph: {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === node.id ? stamped : n)),
      selectionIds: [node.id],
      updatedAtIso: new Date().toISOString(),
    },
    opId: prepared.operation.operationId,
  };
}

function applyPaymentPrep(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "payment_prep" }>,
  contextLabelKo: string | null,
): { graph: SessionGraphV1; opId: string | null } {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return { graph, opId: null };
  }
  const amountLabel =
    typeof node.attrs.amountLabel === "string" ? node.attrs.amountLabel : null;
  const prepared = enqueuePaymentPrepOperation({
    contextEventId: graph.contextEventId,
    contextLabelKo,
    placeId: node.id,
    placeName: node.labelKo,
    amountLabel,
  });
  return {
    graph: {
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === node.id
          ? {
              ...n,
              attrs: { ...n.attrs, paymentPrep: true },
            }
          : n,
      ),
      selectionIds: [node.id],
      updatedAtIso: new Date().toISOString(),
    },
    opId: prepared.operationId,
  };
}

async function applyReservePrepAsync(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "reserve_prep" }>,
  contextLabelKo: string | null,
): Promise<{ graph: SessionGraphV1; opId: string | null }> {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return { graph, opId: null };
  }
  let liteapiOffer: { liteapiOfferId: string | null; amountLabel: string | null } | null =
    null;
  if (node.kind === "lodging") {
    const stay = resolveLodgingStayForTools(graph.contextEventId);
    const attach = await resolveLodgingLiteApiOfferForPrep({
      lat: node.lat,
      lng: node.lng,
      hotelLabelKo: node.labelKo,
      guestCount: stay.guestCount,
      checkInIso: stay.checkInIso,
      checkOutIso: stay.checkOutIso,
      liteapiHotelId:
        typeof node.attrs.liteapiHotelId === "string"
          ? node.attrs.liteapiHotelId
          : typeof node.attrs.searchId === "string" &&
              node.attrs.searchId.startsWith("liteapi:")
            ? node.attrs.searchId.slice("liteapi:".length)
            : null,
      existingOfferId:
        typeof node.attrs.liteapiOfferId === "string"
          ? node.attrs.liteapiOfferId
          : null,
      existingAmountLabel:
        typeof node.attrs.amountLabel === "string" ? node.attrs.amountLabel : null,
    });
    liteapiOffer = {
      liteapiOfferId: attach.liteapiOfferId,
      amountLabel: attach.amountLabel,
    };
  }
  return applyReservePrep(graph, command, contextLabelKo, liteapiOffer);
}

function applyDelete(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "delete_node" }>,
): SessionGraphV1 {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return graph;
  }
  const clearingGroup = node.kind === "group";
  const removeIds = new Set(
    graph.nodes
      .filter(
        (n) =>
          n.id === node.id ||
          n.parentId === node.id ||
          (n.kind === "note" && n.attrs.targetId === node.id),
      )
      .map((n) => n.id),
  );
  return {
    ...graph,
    nodes: graph.nodes
      .filter((n) => !removeIds.has(n.id))
      .map((n) =>
        clearingGroup && n.groupId === node.id ? { ...n, groupId: null } : n,
      ),
    edges: graph.edges.filter(
      (e) => !removeIds.has(e.fromId) && !removeIds.has(e.toId),
    ),
    selectionIds: graph.selectionIds.filter((id) => !removeIds.has(id)),
    compareClusterId:
      graph.compareClusterId && removeIds.has(graph.compareClusterId)
        ? null
        : graph.compareClusterId,
    updatedAtIso: new Date().toISOString(),
  };
}

function applyGroup(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "group_nodes" }>,
): SessionGraphV1 {
  const members: SessionGraphNode[] = [];
  for (const ref of command.memberRefs) {
    const node = resolveNode(graph, ref);
    if (node) {
      members.push(node);
    }
  }
  if (members.length < 2) {
    return graph;
  }
  const groupId = `gnode:${graph.contextEventId}:group:${slug(members.map((m) => m.labelKo).join("-"))}`;
  const labelKo =
    command.labelKo?.trim() ||
    members.map((m) => m.labelKo).join(" · ");
  const groupNode = makeNode({
    id: groupId,
    labelKo,
    kind: "group",
    attrs: { memberCount: members.length },
  });
  const memberIds = new Set(members.map((m) => m.id));
  const nodes = [
    ...graph.nodes.map((n) =>
      memberIds.has(n.id) ? { ...n, groupId } : n,
    ),
    groupNode,
  ];
  const edges: SessionGraphEdge[] = [
    ...graph.edges,
    ...members.map((m) => ({
      id: `gedge:${groupId}:${m.id}`,
      fromId: groupId,
      toId: m.id,
      kind: "group" as const,
      labelKo: "묶음",
    })),
  ];
  return {
    ...graph,
    nodes,
    edges,
    selectionIds: [groupId, ...members.map((m) => m.id)],
    updatedAtIso: new Date().toISOString(),
  };
}

function applyMoveContext(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "move_context" }>,
): SessionGraphV1 {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return graph;
  }
  const folder = command.folderLabelKo?.trim() || "여행";
  const target = ensureSessionGraph({
    contextEventId: command.toContextEventId,
    anchorLat: node.lat ?? graph.anchorLat,
    anchorLng: node.lng ?? graph.anchorLng,
  });
  const moved = makeNode({
    ...node,
    id: `gnode:${target.contextEventId}:moved:${slug(node.labelKo)}`,
    projectFolderKo: folder,
    attrs: {
      ...node.attrs,
      movedFrom: graph.contextEventId,
    },
  });
  const nextTarget: SessionGraphV1 = {
    ...target,
    nodes: [...target.nodes.filter((n) => n.labelKo !== node.labelKo), moved],
    projectFolders: target.projectFolders.includes(folder)
      ? target.projectFolders
      : [...target.projectFolders, folder],
    selectionIds: [moved.id],
    updatedAtIso: new Date().toISOString(),
  };
  writeSessionGraph(nextTarget);

  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== node.id),
    edges: graph.edges.filter(
      (e) => e.fromId !== node.id && e.toId !== node.id,
    ),
    selectionIds: graph.selectionIds.filter((id) => id !== node.id),
    projectFolders: graph.projectFolders.includes(folder)
      ? graph.projectFolders
      : [...graph.projectFolders, folder],
    updatedAtIso: new Date().toISOString(),
  };
}

function applyCreateNote(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "create_note" }>,
): SessionGraphV1 {
  const target = resolveNode(graph, command.targetRef);
  if (!target) {
    return graph;
  }
  const noteId = `gnode:${graph.contextEventId}:note:${slug(target.labelKo)}:${Date.now().toString(36)}`;
  const note = makeNode({
    id: noteId,
    labelKo: command.bodyKo.slice(0, 40),
    kind: "note",
    lat: target.lat,
    lng: target.lng,
    parentId: target.id,
    attrs: {
      bodyKo: command.bodyKo,
      targetId: target.id,
    },
  });
  const edge: SessionGraphEdge = {
    id: `gedge:${noteId}:${target.id}`,
    fromId: target.id,
    toId: noteId,
    kind: "note",
    labelKo: "메모",
  };
  return {
    ...graph,
    nodes: [
      ...graph.nodes.map((n) =>
        n.id === target.id
          ? {
              ...n,
              attrs: { ...n.attrs, noteKo: command.bodyKo },
            }
          : n,
      ),
      note,
    ],
    edges: [...graph.edges, edge],
    selectionIds: [target.id],
    updatedAtIso: new Date().toISOString(),
  };
}

function applyStylePin(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "style_pin" }>,
): SessionGraphV1 {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === node.id
        ? { ...n, accent: command.accent, pinned: true, visible: true }
        : n,
    ),
    selectionIds: [node.id],
    updatedAtIso: new Date().toISOString(),
  };
}

function applySetVisibility(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "set_visibility" }>,
): SessionGraphV1 {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === node.id
        ? {
            ...n,
            alwaysVisible: command.alwaysVisible,
            visible: command.alwaysVisible ? true : false,
          }
        : n,
    ),
    selectionIds: [node.id],
    updatedAtIso: new Date().toISOString(),
  };
}

function applyShareContext(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "share_context" }>,
): SessionGraphV1 {
  const node = resolveNode(graph, command.targetRef);
  if (!node) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === node.id
        ? {
            ...n,
            attrs: { ...n.attrs, sharedPrep: true },
          }
        : n,
    ),
    selectionIds: [node.id],
    updatedAtIso: new Date().toISOString(),
  };
}

function applyReasonPick(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "reason_pick" }>,
): SessionGraphV1 {
  const placeKinds = (n: SessionGraphNode) =>
    n.kind === "lodging" || n.kind === "eatery" || n.kind === "poi";

  const visible = graph.nodes.filter((n) => n.visible && placeKinds(n));
  const selected = graph.selectionIds
    .map((id) => graph.nodes.find((n) => n.id === id))
    .filter((n): n is SessionGraphNode => Boolean(n))
    .filter(placeKinds);

  // Analyze / 「어느 게」「추천」→ Diff visible pool (not just the 1 selected pin).
  const wantPoolPick =
    /어때|어느|낫|추천|골라|고르|분석|그냥\s*해|뭐가/iu.test(command.promptKo);

  let pool: SessionGraphNode[];
  if (wantPoolPick && visible.length >= 2) {
    pool = visible;
  } else if (selected.length >= 2) {
    pool = selected;
  } else if (selected.length === 1 && visible.length >= 2 && wantPoolPick) {
    pool = visible;
  } else if (selected.length > 0) {
    pool = selected;
  } else {
    pool = visible;
  }

  if (pool.length === 0) {
    return graph;
  }

  const picked = invokeRimvioTool("ranking.pick", {
    query: command.promptKo,
    candidates: pool.map((n) => ({
      id: n.id,
      labelKo: n.labelKo,
      rating: n.rating,
      walkMinutes: n.walkMinutes,
      priceBand: n.priceBand,
      reservable: n.reservable,
      localFavorite: n.localFavorite,
    })),
  });
  const winnerId = picked.pickedId;
  if (!winnerId) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (n.id === winnerId) {
        return {
          ...n,
          pinned: true,
          visible: true,
          attrs: {
            ...n.attrs,
            reasonPick: true,
            reasonSummaryKo: picked.summaryKo,
          },
        };
      }
      if (n.attrs.reasonPick === true) {
        return {
          ...n,
          attrs: {
            ...n.attrs,
            reasonPick: false,
            reasonSummaryKo: null,
          },
        };
      }
      return n;
    }),
    selectionIds: [winnerId],
    updatedAtIso: new Date().toISOString(),
  };
}

function applySimulate(
  graph: SessionGraphV1,
  command: Extract<GraphCommand, { op: "simulate" }>,
): SessionGraphV1 {
  const simId = `gnode:${graph.contextEventId}:sim:${slug(command.scenarioKo).slice(0, 24)}`;
  const simNode = makeNode({
    id: simId,
    labelKo: "가정해 보기",
    kind: "simulation",
    lat: graph.anchorLat,
    lng: graph.anchorLng,
    attrs: {
      note: command.scenarioKo,
      scenarioKo: command.scenarioKo,
      committed: false,
    },
  });
  return {
    ...graph,
    nodes: [...graph.nodes.filter((n) => n.kind !== "simulation"), simNode],
    selectionIds: [simId],
    updatedAtIso: new Date().toISOString(),
  };
}

function replyFor(
  commands: readonly GraphCommand[],
  graph: SessionGraphV1,
): string {
  const command = commands[0];
  const op = command?.op;
  if (op === "search_project") {
    if (hasProvisionalContextWorkspace(graph.contextEventId)) {
      const ws = readContextWorkspace(graph.contextEventId);
      const count = ws?.nodes.filter((n) => n.visible).length ?? 0;
      if (count === 0) {
        return "검색 결과가 없어요 · 조건을 바꿔 다시 찾아볼까요";
      }
      return `워크스페이스에 ${count}곳을 펼쳤어요`;
    }
    const count = graph.nodes.filter(
      (n) => n.visible && n.kind !== "compare" && n.kind !== "simulation",
    ).length;
    if (count === 0) {
      return "검색 결과가 없어요 · 조건을 바꿔 다시 찾아볼까요";
    }
    return `지도에 ${count}곳을 펼쳤어요`;
  }
  if (op === "filter") {
    const count = graph.nodes.filter(
      (n) => n.visible && n.kind !== "compare",
    ).length;
    return `${count}곳만 남겼어요`;
  }
  if (op === "pin_node" && command && "targetRef" in command) {
    return `${command.targetRef.labelKo}을 지도에 고정했어요`;
  }
  if (op === "compare") {
    return "두 곳을 비교해 봤어요";
  }
  if (op === "reserve_prep") {
    return "결재함에 예약 준비를 담았어요 · 아직 실행되지 않았어요";
  }
  if (op === "payment_prep") {
    return "결재함에 결제 준비를 담았어요 · 아직 결제되지 않았어요";
  }
  if (op === "delete_node" && command && "targetRef" in command) {
    return `${command.targetRef.labelKo}을 빼 두었어요`;
  }
  if (op === "group_nodes") {
    return "선택한 곳을 하나로 묶었어요";
  }
  if (op === "move_context") {
    const folder =
      command && "folderLabelKo" in command && command.folderLabelKo
        ? command.folderLabelKo
        : "여행";
    return `${folder} 맥락으로 옮겼어요`;
  }
  if (op === "create_note") {
    return "메모를 남겨 두었어요";
  }
  if (op === "style_pin") {
    return "표시 색을 바꿔 두었어요";
  }
  if (op === "set_visibility") {
    return "항상 보이게 해 두었어요";
  }
  if (op === "share_context") {
    return "공유 준비를 해 두었어요 · 아직 보내지 않았어요";
  }
  if (op === "reason_pick") {
    const winner = graph.nodes.find((n) => n.attrs.reasonPick === true);
    if (!winner) {
      return "고를 곳이 없어요";
    }
    const why =
      typeof winner.attrs.reasonSummaryKo === "string"
        ? winner.attrs.reasonSummaryKo.trim()
        : "";
    return why || `${winner.labelKo}을 골라 고정했어요`;
  }
  if (op === "simulate") {
    return "가정을 그려 봤어요 · 아직 반영하지 않았어요";
  }
  return "반영했어요";
}

export function applyGraphCommands(input: {
  contextEventId: string;
  commands: readonly GraphCommand[];
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}): GraphCommandApplyResult | { ok: false; reason: "no_commands" | "no_context" } {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { ok: false, reason: "no_context" };
  }
  if (!input.commands.length) {
    return { ok: false, reason: "no_commands" };
  }

  let graph = ensureSessionGraph({
    contextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  const reservedOpIds: string[] = [];
  const label = input.contextLabelKo?.trim() || null;

  for (const command of input.commands) {
    if (command.op === "search_project") {
      graph = applySearchProject(graph, command);
    } else if (command.op === "filter") {
      graph = applyFilter(graph, command);
    } else if (command.op === "pin_node") {
      graph = applyPin(graph, command, label);
    } else if (command.op === "compare") {
      graph = applyCompare(graph, command);
    } else if (command.op === "reserve_prep") {
      const next = applyReservePrep(graph, command, label);
      graph = next.graph;
      if (next.opId) {
        reservedOpIds.push(next.opId);
      }
    } else if (command.op === "payment_prep") {
      const next = applyPaymentPrep(graph, command, label);
      graph = next.graph;
      if (next.opId) {
        reservedOpIds.push(next.opId);
      }
    } else if (command.op === "delete_node") {
      graph = applyDelete(graph, command);
    } else if (command.op === "group_nodes") {
      graph = applyGroup(graph, command);
    } else if (command.op === "move_context") {
      graph = applyMoveContext(graph, command);
    } else if (command.op === "create_note") {
      graph = applyCreateNote(graph, command);
    } else if (command.op === "style_pin") {
      graph = applyStylePin(graph, command);
    } else if (command.op === "set_visibility") {
      graph = applySetVisibility(graph, command);
    } else if (command.op === "share_context") {
      graph = applyShareContext(graph, command);
    } else if (command.op === "reason_pick") {
      graph = applyReasonPick(graph, command);
    } else if (command.op === "simulate") {
      graph = applySimulate(graph, command);
    }
  }

  writeSessionGraph(graph);
  return {
    ok: true,
    contextEventId,
    commands: input.commands,
    graph,
    assistantReplyKo: replyFor(input.commands, graph),
    reservedOpIds,
  };
}

/**
 * High-level: parse + apply in one call (composer / context-agent gate).
 * Compound plans: use tryRunContextNlAction from action-planner.
 */
export function tryRunGraphCommandOs(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}): GraphCommandApplyResult | null {
  const graph = ensureSessionGraph({
    contextEventId: input.contextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  const commands = parseGraphCommands(input.utterance, graph);
  if (!commands.length) {
    return null;
  }
  // Capsule / price / Field discovery → Context Condition scout, not APA seed.
  if (
    commands[0]?.op === "search_project" &&
    shouldDeferSearchProjectToDiscoveryScout(
      input.utterance,
      input.contextEventId,
    )
  ) {
    return null;
  }
  const result = applyGraphCommands({
    contextEventId: input.contextEventId,
    commands,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    contextLabelKo: input.contextLabelKo,
  });
  return result.ok ? result : null;
}

/** Async apply — live Maps restaurant search + LiteAPI lodging offer attach. */
export async function applyGraphCommandsAsync(input: {
  contextEventId: string;
  commands: readonly GraphCommand[];
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}): Promise<GraphCommandApplyResult | { ok: false; reason: "no_commands" | "no_context" }> {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { ok: false, reason: "no_context" };
  }
  if (!input.commands.length) {
    return { ok: false, reason: "no_commands" };
  }

  let graph = ensureSessionGraph({
    contextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  const reservedOpIds: string[] = [];
  const label = input.contextLabelKo?.trim() || null;

  for (const command of input.commands) {
    if (command.op === "search_project") {
      graph = await applySearchProjectAsync(graph, command);
    } else if (command.op === "filter") {
      graph = applyFilter(graph, command);
    } else if (command.op === "pin_node") {
      graph = applyPin(graph, command, label);
    } else if (command.op === "compare") {
      graph = applyCompare(graph, command);
    } else if (command.op === "reserve_prep") {
      const next = await applyReservePrepAsync(graph, command, label);
      graph = next.graph;
      if (next.opId) {
        reservedOpIds.push(next.opId);
      }
    } else if (command.op === "payment_prep") {
      const next = applyPaymentPrep(graph, command, label);
      graph = next.graph;
      if (next.opId) {
        reservedOpIds.push(next.opId);
      }
    } else if (command.op === "delete_node") {
      graph = applyDelete(graph, command);
    } else if (command.op === "group_nodes") {
      graph = applyGroup(graph, command);
    } else if (command.op === "move_context") {
      graph = applyMoveContext(graph, command);
    } else if (command.op === "create_note") {
      graph = applyCreateNote(graph, command);
    } else if (command.op === "style_pin") {
      graph = applyStylePin(graph, command);
    } else if (command.op === "set_visibility") {
      graph = applySetVisibility(graph, command);
    } else if (command.op === "share_context") {
      graph = applyShareContext(graph, command);
    } else if (command.op === "reason_pick") {
      graph = applyReasonPick(graph, command);
    } else if (command.op === "simulate") {
      graph = applySimulate(graph, command);
    }
  }

  writeSessionGraph(graph);
  return {
    ok: true,
    contextEventId,
    commands: input.commands,
    graph,
    assistantReplyKo: replyFor(input.commands, graph),
    reservedOpIds,
  };
}

export async function tryRunGraphCommandOsAsync(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}): Promise<GraphCommandApplyResult | null> {
  const graph = ensureSessionGraph({
    contextEventId: input.contextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  const commands = parseGraphCommands(input.utterance, graph);
  if (!commands.length) {
    return null;
  }
  if (
    commands[0]?.op === "search_project" &&
    shouldDeferSearchProjectToDiscoveryScout(
      input.utterance,
      input.contextEventId,
    )
  ) {
    return null;
  }
  const result = await applyGraphCommandsAsync({
    contextEventId: input.contextEventId,
    commands,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    contextLabelKo: input.contextLabelKo,
  });
  return result.ok ? result : null;
}
