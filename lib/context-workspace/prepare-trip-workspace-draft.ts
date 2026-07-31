/**
 * Trip Workspace draft — Agent fills the map like a prepared itinerary (ADR-046).
 * Compiler: Intent slots → destination seed → Reality Draft (not Osaka-only control flow).
 */

import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { withWorkspaceRelationships } from "@/lib/context-workspace/sync-workspace-relationships";
import {
  writeContextWorkspace,
  dispatchContextWorkspaceOpen,
  readContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { syncTravelSdkFrameAfterLodgingSeed } from "@/lib/workspace-sdk/sync-travel-sdk-after-lodging-seed";
import {
  observeWorldState,
  upsertWorldSignal,
} from "@/lib/workstream/world-state";
import { publishAgentRuntimeEvent } from "@/lib/workstream/agent-runtime-bus";
import type { TripPrepSlots } from "@/lib/action-planner/build-trip-prep-plan";
import { appendWorkspaceSyncedAssistantTurn } from "@/lib/context-workspace/build-workspace-chat-sync";
import {
  appendWorkspaceChatTurn,
  readWorkspaceChat,
} from "@/lib/context-workspace/workspace-chat-store";
import { buildRealityDraft } from "@/lib/context-workspace/reality-draft/build-reality-draft";
import {
  compileTripEntitySlots,
  materializeTripDraftStops,
  resolveTripDayCount,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
import type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { buildIntentPlan } from "@/lib/intent-router/build-intent-plan";
import type { IntentRoute } from "@/lib/intent-router/types";
import { writeGlobeResumeSession } from "@/lib/globe/globe-resume-session";
import {
  clearSoftNextWorkContinueMemory,
  offerSoftNextWorkAfterAct,
} from "@/lib/workstream/offer-soft-next-work-after-act";
import { stampTripDraftOntoContext } from "@/lib/context-workspace/stamp-trip-draft-onto-context";

export type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
export { OSAKA_TRIP_DRAFT_STOPS } from "@/lib/context-workspace/reality-draft/trip-draft-stops";

function stopToNode(
  stop: TripDraftStop,
  index: number,
  prev: TripDraftStop | null,
): ContextWorkspaceNode {
  const km =
    prev != null
      ? haversineKm(prev.lat, prev.lng, stop.lat, stop.lng)
      : 0;
  const leg =
    index === 0
      ? "도착 · 이동"
      : `${stop.walkMinutes}분 · ${km < 10 ? km.toFixed(1) : Math.round(km)}km`;
  const price = stop.amountLabel?.trim();
  const summaryKo = [price, leg].filter(Boolean).join(" · ") || leg;

  return {
    id: `ws-node:${stop.id}`,
    kind: stop.kind,
    placeId: stop.id,
    title: stop.title,
    summaryKo,
    lat: stop.lat,
    lng: stop.lng,
    rating: stop.rating,
    priceBand: price ? 2 : null,
    amountLabel: price ?? null,
    reviewCount: null,
    thumbnailUrl: null,
    tags: [...stop.tags],
    visible: true,
    selected: stop.kind === "lodging",
    /** Keep all draft Entities on map through lodging/eatery rescout. */
    bookmarked: true,
    source: "trip_prep_draft",
    /** Spatial Reality Draft — Action-Ready, not Committed. */
    actionReadyState: "ready",
  };
}

function stopsToNodes(stops: readonly TripDraftStop[]): ContextWorkspaceNode[] {
  const nodes: ContextWorkspaceNode[] = [];
  for (let i = 0; i < stops.length; i += 1) {
    const stop = stops[i]!;
    const prev = i > 0 ? stops[i - 1]! : null;
    nodes.push(stopToNode(stop, i, prev));
  }
  return nodes;
}

function stubIntentRoute(input: {
  destinationKo: string;
  stayLabelKo: string | null;
}): IntentRoute {
  return {
    domain: "travel",
    mode: "create",
    confidence: "draft",
    contextState: "none",
    action: "create_project",
    surface: "draft_preview",
    destinationKo: input.destinationKo,
    stayLabelKo: input.stayLabelKo,
    reasonKo: "trip_entity_slots",
  };
}

/**
 * Prepare a focused trip Workspace map draft and expand it.
 */
export function prepareTripWorkspaceDraft(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly tripPrep?: TripPrepSlots | null;
  readonly expand?: boolean;
  /** When caller already wrote the user chat turn. */
  readonly skipUserChat?: boolean;
}): ContextWorkspaceState | null {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) return null;

  const dest =
    input.tripPrep?.destinationKo?.trim() ||
    (/오사카|osaka|大阪/iu.test(utterance) ? "오사카" : null) ||
    (/제주|jeju/iu.test(utterance) ? "제주" : null) ||
    (/도쿄|tokyo|東京/iu.test(utterance) ? "도쿄" : null) ||
    "여행지";
  const nights = input.tripPrep?.nights;
  const days = input.tripPrep?.days;
  const stayMatch = /(\d+)\s*박\s*(\d+)\s*일/u.exec(utterance);
  const stay =
    nights != null && days != null
      ? `${nights}박${days}일`
      : nights != null
        ? `${nights}박`
        : /4\s*박\s*5\s*일/iu.test(utterance)
          ? "4박5일"
          : stayMatch
            ? `${stayMatch[1]}박${stayMatch[2]}일`
            : null;

  const dayCount = resolveTripDayCount({
    days: days ?? null,
    nights: nights ?? null,
    stayLabelKo: stay,
  });
  const plan = buildIntentPlan({
    route: stubIntentRoute({ destinationKo: dest, stayLabelKo: stay }),
    utterance,
  });
  const slots = compileTripEntitySlots({
    destinationKo: dest,
    stayLabelKo: stay,
    days: days ?? dayCount,
    nights: nights ?? null,
    expectedEntities: plan.expectedEntities,
  });
  const { stops, seededFrom } = materializeTripDraftStops({
    destinationKo: dest,
    utterance,
    slots,
    dayCount,
  });
  const osaka = seededFrom === "osaka_catalog";
  const query = stay ? `${dest} ${stay} 여행` : `${dest} 여행 준비`;
  const summaryKo = stay
    ? `${dest} · ${stay} Reality Draft · READY`
    : `${dest} 여행 Reality Draft`;

  const nodes = stopsToNodes(stops);
  const now = new Date().toISOString();
  const prev = readContextWorkspace(contextEventId);
  const workspaceId =
    prev && (prev.status === "editing" || prev.status === "committing")
      ? prev.workspaceId
      : `ws:${contextEventId}:${Date.now()}`;
  const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
  const draft: ContextWorkspaceState = {
    version: 1,
    workspaceId,
    contextEventId,
    domain: "poi",
    status: "editing",
    query,
    summaryKo,
    nodes,
    filter: {},
    selectedIds,
    compareIds: [],
    surfacePrimary: "embedded_preview",
    openedAtIso: prev?.openedAtIso ?? now,
    updatedAtIso: now,
    committedAtIso: null,
    lastChangeKo: `${nodes.length}곳 여행 초안 · 지도에 펼침`,
    lastWhy: {
      actionKo: `${dest} 여행 Workspace 생성`,
      reasonsKo: [
        "Goal · Planning",
        osaka ? "난바 중심 동선" : `${dest} Intent 슬롯`,
        "실내·야외 균형",
      ],
      impactsKo: ["지도 핀 · 동선 · Opportunity 준비"],
      nodeIds: nodes.slice(0, 3).map((n) => n.id),
      atIso: now,
    },
    history: prev?.history ?? [],
    future: [],
    relationshipEdges: [],
    compilerIr: prev?.compilerIr ?? null,
  };
  let state = withWorkspaceRelationships(draft, query);
  const realityDraft = buildRealityDraft({
    contextTitleKo: stay ? `${dest} ${stay}` : `${dest} 여행`,
    destinationKo: dest,
    stayLabelKo: stay,
    nodes: state.nodes,
  });
  state = {
    ...state,
    realityDraft,
    lastChangeKo: realityDraft
      ? `${realityDraft.days.length}일 Reality Draft · Prepared`
      : state.lastChangeKo,
  };
  writeContextWorkspace(state);
  dispatchContextWorkspaceOpen({
    contextEventId,
    workspaceId,
    source: "trip_prep",
  });

  // Continuity chip on Globe — Resume opens Workspace (Reality OS).
  if (typeof window !== "undefined") {
    writeGlobeResumeSession({
      eventId: contextEventId,
      title: stay ? `${dest} · ${stay}` : `${dest} 여행`,
      placeLabel: dest,
      kind: "context",
    });
  }

  // Stamp dest/dates onto Context so Agent % moves and 「계속 진행」 works.
  stampTripDraftOntoContext({
    contextEventId,
    destinationKo: dest,
    stayLabelKo: stay,
    nights: nights ?? (stayMatch ? Number.parseInt(stayMatch[1]!, 10) : null),
    days: days ?? (stayMatch ? Number.parseInt(stayMatch[2]!, 10) : null),
    tripPrep: input.tripPrep ?? null,
  });
  clearSoftNextWorkContinueMemory(contextEventId);
  // Auto-chain next soft scout (숙소 → …) without extra clicks.
  offerSoftNextWorkAfterAct({
    contextEventId,
    lastAct: "open_workspace",
    lastUtterance: utterance,
    delayMs: 480,
    autoRun: true,
  });

  observeWorldState({
    contextEventId,
    destinationHint: dest,
    utterance,
  });
  if (osaka) {
    upsertWorldSignal({
      contextEventId,
      signal: {
        id: "weather:rain-forecast",
        kind: "weather",
        severity: "watch",
        labelKo: "비 예보",
        detailKo: "오후 소나기 — 실내 쿠로몬 코스 권장",
        hint: "rain_indoor_revise",
      },
    });
    upsertWorldSignal({
      contextEventId,
      signal: {
        id: "transit:crowd-moderate",
        kind: "transit",
        severity: "info",
        labelKo: "일정 혼잡도",
        detailKo: "보통",
        hint: "crowd_moderate",
      },
    });
  }

  syncTravelSdkFrameAfterLodgingSeed({
    contextEventId,
    candidateCount: state.nodes.length,
    headerTitleKo: stay ? `${dest} · ${stay}` : dest,
  });

  if (input.expand !== false) {
    writeContextWorkspaceExpanded(contextEventId, true);
    if (typeof window !== "undefined") {
      dispatchContextWorkspaceExpand({
        contextEventId,
        source: "trip_prep",
      });
    }
  }

  publishAgentRuntimeEvent({
    kind: "plan_built",
    contextEventId,
    labelKo: summaryKo,
    payload: {
      stops: state.nodes.length,
      destination: dest,
      seededFrom,
      slots: slots.length,
    },
  });

  const existing = readWorkspaceChat(contextEventId);
  const hasUser = existing.some(
    (t) => t.role === "user" && t.text.slice(0, 16) === utterance.slice(0, 16),
  );
  if (!input.skipUserChat && !hasUser) {
    appendWorkspaceChatTurn({
      contextEventId,
      role: "user",
      text: utterance,
    });
  }
  appendWorkspaceSyncedAssistantTurn({
    contextEventId,
    state: readContextWorkspace(contextEventId) ?? state,
    includeContextBrief: true,
    includeDayPlan: false,
    realityDraft:
      (readContextWorkspace(contextEventId) ?? state).realityDraft ?? null,
    textKo: stay
      ? `${dest} ${stay} Reality Draft · Prepared`
      : `${dest} 여행 Reality Draft · Prepared`,
  });

  return readContextWorkspace(contextEventId) ?? state;
}

/** Whether utterance should auto-prepare a full trip map draft. */
export function shouldPrepareTripWorkspaceDraft(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  return (
    /여행\s*준비|준비해(?:줘|요|놔|주세요)?|알아서\s*준비|trip\s*prep|일정\s*(?:짜|세워|만들)|추천\s*일정/iu.test(
      text,
    ) &&
    (/여행|trip|4\s*박|3\s*박|5\s*일|놀러/iu.test(text) ||
      /오사카|제주|도쿄|osaka|jeju/iu.test(text))
  );
}
