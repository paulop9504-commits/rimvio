/**
 * Trip Workspace draft — Agent fills the map like a prepared itinerary (ADR-046).
 * One Focus: route + World chips + one Opportunity. Not a freeform LLM layout.
 */

import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
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
import {
  OSAKA_APA_NAMBA,
  looksLikeOsakaContext,
} from "@/lib/search-engine/osaka-demo-catalog";
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

export type TripDraftStop = {
  readonly id: string;
  readonly kind: ContextWorkspaceNode["kind"];
  readonly title: string;
  readonly lat: number;
  readonly lng: number;
  readonly amountLabel: string | null;
  readonly walkMinutes: number;
  readonly tags: readonly string[];
  readonly rating: number;
  readonly indoor: boolean;
};

/** Osaka Namba-centered 4–5 day focus route (mockup-shaped). */
export const OSAKA_TRIP_DRAFT_STOPS: readonly TripDraftStop[] = [
  {
    id: "poi:osaka:namba-parks",
    kind: "poi",
    title: "난바 파크스",
    lat: 34.6615,
    lng: 135.5022,
    amountLabel: null,
    walkMinutes: 0,
    tags: ["anchor", "mall", "실내"],
    rating: 4.4,
    indoor: true,
  },
  {
    id: OSAKA_APA_NAMBA.id,
    kind: "lodging",
    title: "APA 난바",
    lat: OSAKA_APA_NAMBA.lat,
    lng: OSAKA_APA_NAMBA.lng,
    amountLabel: "₩12만/박",
    walkMinutes: 4,
    tags: ["lodging", "reservable", "실내"],
    rating: 4.3,
    indoor: true,
  },
  {
    id: "poi:osaka:dotonbori",
    kind: "poi",
    title: "도톤보리",
    lat: 34.6687,
    lng: 135.5013,
    amountLabel: null,
    walkMinutes: 8,
    tags: ["photo_spot", "야외", "landmark"],
    rating: 4.6,
    indoor: false,
  },
  {
    id: "poi:osaka:kuromon",
    kind: "poi",
    title: "쿠로몬 시장",
    lat: 34.6662,
    lng: 135.5063,
    amountLabel: "₩13k",
    walkMinutes: 13,
    tags: ["실내", "market", "food", "rain_safe"],
    rating: 4.5,
    indoor: true,
  },
  {
    id: "poi:osaka:ebisu-bridge",
    kind: "poi",
    title: "에비스교",
    lat: 34.6689,
    lng: 135.501,
    amountLabel: null,
    walkMinutes: 10,
    tags: ["photo_spot", "야외", "quiet_alt"],
    rating: 4.3,
    indoor: false,
  },
  {
    id: "poi:osaka:shitennoji",
    kind: "poi",
    title: "사천왕사",
    lat: 34.6534,
    lng: 135.5064,
    amountLabel: "입장료",
    walkMinutes: 22,
    tags: ["temple", "한적", "quiet"],
    rating: 4.5,
    indoor: false,
  },
  {
    id: "eatery:osaka:endouroji",
    kind: "eatery",
    title: "엔도지로지",
    lat: 34.6641,
    lng: 135.4998,
    amountLabel: "₩2만",
    walkMinutes: 12,
    tags: ["local_favorite", "실내", "reservable"],
    rating: 4.7,
    indoor: true,
  },
];

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
      ? "출발 앵커"
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
    selected: index === 1 && stop.kind === "lodging",
    bookmarked: index === 1 && stop.kind === "lodging",
    source: "trip_prep_draft",
  };
}

function buildOsakaNodes(): ContextWorkspaceNode[] {
  const nodes: ContextWorkspaceNode[] = [];
  for (let i = 0; i < OSAKA_TRIP_DRAFT_STOPS.length; i += 1) {
    const stop = OSAKA_TRIP_DRAFT_STOPS[i]!;
    const prev = i > 0 ? OSAKA_TRIP_DRAFT_STOPS[i - 1]! : null;
    nodes.push(stopToNode(stop, i, prev));
  }
  return nodes;
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
    "여행지";
  const nights = input.tripPrep?.nights;
  const days = input.tripPrep?.days;
  const stay =
    nights != null && days != null
      ? `${nights}박${days}일`
      : nights != null
        ? `${nights}박`
        : /4\s*박\s*5\s*일/iu.test(utterance)
          ? "4박5일"
          : null;

  const osaka = looksLikeOsakaContext({ query: `${dest} ${utterance}` });
  const query = stay ? `${dest} ${stay} 여행` : `${dest} 여행 준비`;
  const summaryKo = stay
    ? `${dest} · ${stay} 동선 준비 완료`
    : `${dest} 여행 동선 초안`;

  let state: ContextWorkspaceState;

  if (osaka) {
    const nodes = buildOsakaNodes();
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
        reasonsKo: ["Goal · Planning", "난바 중심 4–5일 동선", "실내·야외 균형"],
        impactsKo: ["지도 핀 · 동선 · Opportunity 준비"],
        nodeIds: nodes.slice(0, 3).map((n) => n.id),
        atIso: now,
      },
      history: prev?.history ?? [],
      future: [],
      relationshipEdges: [],
      compilerIr: prev?.compilerIr ?? null,
    };
    state = withWorkspaceRelationships(draft, query);
    writeContextWorkspace(state);
    dispatchContextWorkspaceOpen({
      contextEventId,
      workspaceId,
      source: "trip_prep",
    });
  } else {
    state = openMapContextWorkspace({
      contextEventId,
      domain: "lodging",
      query,
      summaryKo,
      hits: [],
      source: "trip_prep",
    });
  }

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
    payload: { stops: state.nodes.length, destination: dest },
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
    includeDayPlan: osaka,
    textKo: stay
      ? `좋아요. ${dest} ${stay} Context를 만들고 항공·숙소·일정을 Workspace에 준비했어요.`
      : `좋아요. ${dest} 여행 Context를 Workspace에 준비했어요.`,
  });

  return readContextWorkspace(contextEventId) ?? state;
}

/** Whether utterance should auto-prepare a full trip map draft. */
export function shouldPrepareTripWorkspaceDraft(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  return (
    /여행\s*준비|준비해(?:줘|요|놔|주세요)?|알아서\s*준비|trip\s*prep|일정\s*(?:짜|세워|만들)/iu.test(
      text,
    ) &&
    (/여행|trip|4\s*박|3\s*박|5\s*일|놀러/iu.test(text) ||
      /오사카|제주|도쿄|osaka|jeju/iu.test(text))
  );
}
