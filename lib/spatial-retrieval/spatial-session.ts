/**
 * Spatial Retrieval multi-turn session (E2E pipeline host).
 *
 * NL → Intent → Context → Anchor → Spatial Retrieval → Reality Graph →
 * Workspace Projection → Dynamic Callout → Prepare (Draft) → User Commit
 */

import { resolveSpatialAnchorDetailed } from "@/lib/spatial-retrieval/anchor-resolver";
import { resolveSpatialContext } from "@/lib/spatial-retrieval/context-resolver";
import {
  createScheduleDraftEdge,
  isPreCommitDraft,
} from "@/lib/spatial-retrieval/draft-edge";
import { parseSpatialDiscoveryIntent } from "@/lib/spatial-retrieval/intent-parser";
import { runSpatialRetrieval } from "@/lib/spatial-retrieval/run-spatial-retrieval";
import type {
  SpatialAnchorResolved,
  SpatialContextAwareCallout,
  SpatialContextRef,
  SpatialDraftEdge,
  SpatialProjectionPin,
  SpatialRealityEntity,
  SpatialRealityRelationship,
  SpatialRetrievalResult,
} from "@/lib/spatial-retrieval/types";

export type SpatialSessionPhase =
  | "empty"
  | "context_ready"
  | "anchor_ready"
  | "discovery_ready"
  | "draft_ready";

export type SpatialSessionState = {
  readonly phase: SpatialSessionPhase;
  readonly context: SpatialContextRef | null;
  readonly anchor: SpatialAnchorResolved | null;
  readonly candidates: readonly {
    readonly entityId: string;
    readonly titleKo: string;
    readonly kind: string;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly selected?: boolean;
    readonly contextAnchor?: boolean;
  }[];
  readonly lastRetrieval: SpatialRetrievalResult | null;
  readonly realityEntities: readonly SpatialRealityEntity[];
  readonly realityRelationships: readonly SpatialRealityRelationship[];
  readonly pins: readonly SpatialProjectionPin[];
  readonly callouts: readonly SpatialContextAwareCallout[];
  readonly draftEdges: readonly SpatialDraftEdge[];
  readonly focusEntityId: string | null;
  readonly logs: readonly string[];
};

export type SpatialSessionTurnResult = {
  readonly state: SpatialSessionState;
  readonly handled: boolean;
  readonly kind:
    | "context_created"
    | "anchor_fixed"
    | "spatial_discovery"
    | "draft_edge"
    | "unhandled";
  readonly messageKo: string;
};

function emptyState(): SpatialSessionState {
  return {
    phase: "empty",
    context: null,
    anchor: null,
    candidates: [],
    lastRetrieval: null,
    realityEntities: [],
    realityRelationships: [],
    pins: [],
    callouts: [],
    draftEdges: [],
    focusEntityId: null,
    logs: [],
  };
}

function looksLikeCreateTrip(text: string): boolean {
  return /여행\s*만들|트립\s*만들|trip\s*만들|오사카\s*여행|여행\s*계획/iu.test(
    text,
  );
}

function looksLikeFixAnchor(text: string): boolean {
  // "난바 호텔 고정" · "호텔 고정해" — not discovery ("맛집 찾아")
  if (/맛집|찾아|보여|근처\s*맛|주변\s*맛/iu.test(text)) return false;
  return /고정|선택해|잡아|set\s*anchor/iu.test(text) &&
    /호텔|hotel|난바|namba|숙소/iu.test(text);
}

function looksLikeAddToSchedule(text: string): boolean {
  return /일정에\s*넣|일정\s*추가|여기\s*넣|스케줄에|add\s*to\s*(day|schedule)/iu.test(
    text,
  );
}

/**
 * Apply one user NL turn to the Spatial Retrieval session.
 */
export function applySpatialSessionTurn(
  state: SpatialSessionState,
  text: string,
): SpatialSessionTurnResult {
  const raw = text.trim();
  const logs = [...state.logs, `User · ${raw}`];

  // 1. Create Context
  if (looksLikeCreateTrip(raw) && state.phase === "empty") {
    const intent = parseSpatialDiscoveryIntent("오사카 호텔 근처 맛집 찾아줘");
    const context = resolveSpatialContext({
      workspaceId: "ws-osaka-trip",
      contextTitleKo: /오사카/iu.test(raw) ? "Osaka Trip" : "Trip",
      intent: intent ?? {
        type: "SPATIAL_DISCOVERY",
        targetEntity: "restaurant",
        anchorEntity: "hotel",
        relation: "nearby",
        constraints: {
          distance: null,
          walkingTime: null,
          category: null,
        },
        rawText: raw,
      },
    });
    const next: SpatialSessionState = {
      ...state,
      phase: "context_ready",
      context,
      logs: [...logs, `Context 생성 · ${context.contextId} · ${context.titleKo}`],
    };
    return {
      state: next,
      handled: true,
      kind: "context_created",
      messageKo: `Context 생성 · ${context.titleKo}`,
    };
  }

  // 2. Fix Anchor
  if (
    looksLikeFixAnchor(raw) &&
    (state.phase === "context_ready" ||
      state.phase === "anchor_ready" ||
      state.phase === "empty")
  ) {
    const context =
      state.context ??
      resolveSpatialContext({
        workspaceId: "ws-osaka-trip",
        contextTitleKo: "Osaka Trip",
        intent: {
          type: "SPATIAL_DISCOVERY",
          targetEntity: "restaurant",
          anchorEntity: "hotel",
          relation: "nearby",
          constraints: {
            distance: null,
            walkingTime: null,
            category: null,
          },
          rawText: raw,
        },
      });

    const candidates = [
      {
        entityId: "hotel_123",
        titleKo: "Namba Hotel",
        kind: "hotel",
        lat: 34.6654,
        lng: 135.501,
        selected: true,
        contextAnchor: true,
      },
      ...state.candidates.filter((c) => c.entityId !== "hotel_123"),
    ];

    const intent = {
      type: "SPATIAL_DISCOVERY" as const,
      targetEntity: "restaurant" as const,
      anchorEntity: "hotel" as const,
      relation: "nearby" as const,
      constraints: {
        distance: null,
        walkingTime: null,
        category: null,
      },
      rawText: raw,
    };
    const resolved = resolveSpatialAnchorDetailed({
      intent,
      contextId: context.contextId,
      candidates,
    });
    if (!resolved.ok) {
      return {
        state: { ...state, logs },
        handled: true,
        kind: "unhandled",
        messageKo: "Anchor 후보를 표시했어요",
      };
    }

    const next: SpatialSessionState = {
      ...state,
      phase: "anchor_ready",
      context,
      anchor: resolved.anchor,
      candidates,
      logs: [
        ...logs,
        `Anchor 생성 · ${resolved.anchor.labelKo} (${resolved.resolver.anchorId})`,
      ],
    };
    return {
      state: next,
      handled: true,
      kind: "anchor_fixed",
      messageKo: `Anchor 생성 · ${resolved.anchor.labelKo}`,
    };
  }

  // 3. Spatial Discovery
  const spatialIntent = parseSpatialDiscoveryIntent(raw);
  if (spatialIntent) {
    const workspaceId = state.context?.workspaceId ?? "ws-osaka-trip";
    const candidates =
      state.candidates.length > 0
        ? state.candidates
        : state.anchor
          ? [
              {
                entityId: state.anchor.entityId,
                titleKo: state.anchor.titleKo,
                kind: state.anchor.kind,
                lat: state.anchor.lat,
                lng: state.anchor.lng,
                selected: true,
                contextAnchor: true,
              },
            ]
          : [
              {
                entityId: "hotel_123",
                titleKo: "Namba Hotel",
                kind: "hotel",
                lat: 34.6654,
                lng: 135.501,
                selected: true,
                contextAnchor: true,
              },
            ];

    const retrieval = runSpatialRetrieval({
      text: raw,
      workspaceId,
      contextTitleKo: state.context?.titleKo ?? "Osaka Trip",
      candidates,
      log: false,
    });

    if (!retrieval.ok) {
      return {
        state: {
          ...state,
          logs: [...logs, `Spatial Discovery 실패 · ${retrieval.reasonKo}`],
        },
        handled: true,
        kind: "spatial_discovery",
        messageKo: retrieval.reasonKo,
      };
    }

    const focusEntityId = retrieval.entities[0]?.entityId ?? null;
    const next: SpatialSessionState = {
      ...state,
      phase: "discovery_ready",
      context: retrieval.context,
      anchor: retrieval.anchor,
      candidates,
      lastRetrieval: retrieval,
      realityEntities: retrieval.realityEntities,
      realityRelationships: retrieval.realityRelationships,
      pins: retrieval.pins,
      callouts: retrieval.callouts,
      focusEntityId,
      logs: [
        ...logs,
        `Intent · ${retrieval.intent.type}`,
        `Restaurant Entity 생성 · ${retrieval.entities.length}`,
        `Nearby Relationship 생성 · ${retrieval.realityRelationships.length}`,
        `Map Pin 추가 · ${retrieval.pins.filter((p) => p.role === "discovered").length}`,
        `Callout 표시 · ${retrieval.callouts.length} · mode=discovery`,
      ],
    };
    return {
      state: next,
      handled: true,
      kind: "spatial_discovery",
      messageKo: "Spatial Discovery 완료",
    };
  }

  // 4. Add to schedule → Draft Edge (pre-Commit)
  if (
    looksLikeAddToSchedule(raw) &&
    (state.phase === "discovery_ready" || state.phase === "draft_ready")
  ) {
    const toId =
      state.focusEntityId ??
      state.callouts[0]?.entityId ??
      state.realityEntities.find((e) => e.type === "restaurant")?.id;
    const fromId = state.anchor?.entityId ?? "hotel_123";
    if (!toId) {
      return {
        state: { ...state, logs },
        handled: true,
        kind: "unhandled",
        messageKo: "넣을 식당이 없어요",
      };
    }
    const title =
      state.callouts.find((c) => c.entityId === toId)?.titleKo ??
      state.realityEntities.find((e) => e.id === toId)?.attributes.titleKo;
    const draft = createScheduleDraftEdge({
      fromEntityId: fromId,
      toEntityId: toId,
      titleKo: title,
    });
    if (!isPreCommitDraft(draft)) {
      throw new Error("Draft must stay pre-commit");
    }
    const next: SpatialSessionState = {
      ...state,
      phase: "draft_ready",
      draftEdges: [...state.draftEdges, draft],
      logs: [
        ...logs,
        `Draft Edge 생성 · ${draft.id} · committed=false`,
        "Commit 전 상태 유지",
      ],
    };
    return {
      state: next,
      handled: true,
      kind: "draft_edge",
      messageKo: "Draft Edge 생성 · Commit 전",
    };
  }

  return {
    state: { ...state, logs },
    handled: false,
    kind: "unhandled",
    messageKo: "처리하지 못했어요",
  };
}

export function createSpatialSession(): SpatialSessionState {
  return emptyState();
}
