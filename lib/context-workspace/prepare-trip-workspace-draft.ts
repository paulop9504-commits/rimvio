/**
 * Trip Workspace draft — Agent fills the map like a prepared itinerary (ADR-046).
 * Compiler: L1 dayPart slots → L2 burst inventory → L3 pick → L4 Reality Draft.
 * Osaka hardcode is fallback seed only when burst leaves gaps.
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
  burstFillTripInventory,
  burstFillTripInventoryViaTools,
} from "@/lib/context-workspace/reality-draft/burst-fill-trip-inventory";
import {
  compileTripEntitySlots,
  materializeTripDraftStops,
  resolveTripDayCount,
  type TripSlotInventory,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
import { refineTripDraftStops } from "@/lib/context-workspace/reality-draft/refine-trip-draft-stops";
import type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { buildIntentPlan } from "@/lib/intent-router/build-intent-plan";
import type { IntentRoute } from "@/lib/intent-router/types";
import { writeGlobeResumeSession } from "@/lib/globe/globe-resume-session";
import {
  clearSoftNextWorkContinueMemory,
  offerSoftNextWorkAfterAct,
} from "@/lib/workstream/offer-soft-next-work-after-act";
import { stampTripDraftOntoContext } from "@/lib/context-workspace/stamp-trip-draft-onto-context";
import { openCapabilityLayoutForWorkspace } from "@/lib/workspace-capability";

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
  const unresolved = stop.entityResolved === false;
  const summaryKo = [
    price,
    unresolved ? "장소 미확정" : null,
    leg,
  ]
    .filter(Boolean)
    .join(" · ") || leg;
  const thumb =
    stop.thumbnailUrl?.trim() || stop.galleryUrls?.[0]?.trim() || null;
  const gallery =
    stop.galleryUrls?.filter((u) => typeof u === "string" && u.trim()) ?? null;

  return {
    id: `ws-node:${stop.id}`,
    kind: stop.kind,
    placeId: stop.id,
    title: stop.title,
    summaryKo,
    lat: stop.lat,
    lng: stop.lng,
    rating: stop.rating,
    priceBand: stop.priceBand ?? (price ? 2 : null),
    amountLabel: price ?? null,
    reviewCount: stop.reviewCount ?? null,
    thumbnailUrl: thumb,
    galleryUrls: gallery && gallery.length > 0 ? gallery : null,
    liteapiOfferId: stop.liteapiOfferId ?? null,
    tags: [...stop.tags],
    visible: true,
    // Soft focus only — do not pre-select or pin every skeleton
    // (map ✓/✗ chrome was firing on all bookmarked draft pins).
    selected: false,
    bookmarked: false,
    source:
      stop.placeSource === "maps" ||
      stop.placeSource === "liteapi" ||
      stop.placeSource === "booking"
        ? `trip_prep_${stop.placeSource}`
        : "trip_prep_draft",
    /** Spatial Reality Draft — Action-Ready, not Committed. */
    actionReadyState: unresolved ? "prepare" : "ready",
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

type TripPrepCompile = {
  readonly dest: string;
  readonly stay: string | null;
  readonly nights: number | null | undefined;
  readonly days: number | null | undefined;
  readonly stayMatch: RegExpExecArray | null;
  readonly dayCount: number;
  readonly slots: ReturnType<typeof compileTripEntitySlots>;
};

function compileTripPrepInput(input: {
  readonly utterance: string;
  readonly tripPrep?: TripPrepSlots | null;
}): TripPrepCompile {
  const utterance = input.utterance.trim();
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
  return { dest, stay, nights, days, stayMatch, dayCount, slots };
}

function writeTripWorkspaceFromInventories(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly tripPrep?: TripPrepSlots | null;
  readonly expand?: boolean;
  readonly skipUserChat?: boolean;
  /** Tool enrich pass — skip chat / soft-next re-fire. */
  readonly enrichOnly?: boolean;
  readonly compiled: TripPrepCompile;
  readonly inventories: readonly TripSlotInventory[];
  readonly inventoryVia: "sync_search" | "tool_registry";
}): ContextWorkspaceState | null {
  const {
    utterance,
    contextEventId,
    expand,
    skipUserChat,
    enrichOnly,
    compiled,
    inventories,
  } = input;
  const { dest, stay, nights, days, stayMatch, dayCount, slots } = compiled;

  const materialized = materializeTripDraftStops({
    destinationKo: dest,
    utterance,
    slots,
    dayCount,
    inventories,
  });
  const refined = refineTripDraftStops({
    stops: materialized.stops,
    slots,
    inventories,
    utterance,
    destinationKo: dest,
  });
  const stops = refined.stops;
  const seededFrom = materialized.seededFrom;
  const osaka =
    seededFrom === "osaka_catalog" || /오사카|osaka|大阪/iu.test(dest);
  const query = stay ? `${dest} ${stay} 여행` : `${dest} 여행 준비`;
  const resolvedCount = stops.filter((s) => s.entityResolved !== false).length;
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
    lastChangeKo: enrichOnly
      ? `Place Entity ${resolvedCount}/${nodes.length} · Tool 연결`
      : `${nodes.length}곳 여행 초안 · 지도에 펼침`,
    lastWhy: {
      actionKo: `${dest} 여행 Workspace 생성`,
      reasonsKo: [
        "Goal · Planning",
        input.inventoryVia === "tool_registry"
          ? "hotel.lookup · restaurant.lookup · maps.search"
          : seededFrom === "live_burst"
            ? "Day×slot burst inventory"
            : osaka
              ? "난바 중심 fallback seed"
              : `${dest} Intent 슬롯`,
        "morning · lunch · afternoon · dinner",
        refined.repairedLegs > 0
          ? `동선 ${refined.repairedLegs}곳 재배치`
          : "클러스터 동선",
        refined.weatherSwapped > 0
          ? `우천 실내 ${refined.weatherSwapped}곳`
          : "날씨 관찰",
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
      ? enrichOnly
        ? `Place Entity ${resolvedCount}/${nodes.length} · ${realityDraft.days.length}일`
        : `${realityDraft.days.length}일 Reality Draft · Prepared`
      : state.lastChangeKo,
  };
  writeContextWorkspace(state);
  openCapabilityLayoutForWorkspace({
    state,
    utterance,
    forceIntent: "trip_plan",
    replace: true,
  });
  if (!enrichOnly) {
    dispatchContextWorkspaceOpen({
      contextEventId,
      workspaceId,
      source: "trip_prep",
    });
  }

  if (typeof window !== "undefined" && !enrichOnly) {
    writeGlobeResumeSession({
      eventId: contextEventId,
      title: stay ? `${dest} · ${stay}` : `${dest} 여행`,
      placeLabel: dest,
      kind: "context",
    });
  }

  stampTripDraftOntoContext({
    contextEventId,
    destinationKo: dest,
    stayLabelKo: stay,
    nights: nights ?? (stayMatch ? Number.parseInt(stayMatch[1]!, 10) : null),
    days: days ?? (stayMatch ? Number.parseInt(stayMatch[2]!, 10) : null),
    tripPrep: input.tripPrep ?? null,
  });

  if (!enrichOnly) {
    clearSoftNextWorkContinueMemory(contextEventId);
    offerSoftNextWorkAfterAct({
      contextEventId,
      lastAct: "open_workspace",
      lastUtterance: utterance,
      delayMs: 480,
      autoRun: true,
    });
  }

  observeWorldState({
    contextEventId,
    destinationHint: dest,
    utterance,
  });
  if (osaka && !enrichOnly) {
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

  if (expand !== false && !enrichOnly) {
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
      inventories: inventories.length,
      picked: inventories.filter((i) => i.picked != null).length,
      repairedLegs: refined.repairedLegs,
      weatherSwapped: refined.weatherSwapped,
      rainy: refined.rainy,
      inventoryVia: input.inventoryVia,
      entityResolved: resolvedCount,
      enrichOnly: Boolean(enrichOnly),
    },
  });

  if (!enrichOnly) {
    const existing = readWorkspaceChat(contextEventId);
    const hasUser = existing.some(
      (t) => t.role === "user" && t.text.slice(0, 16) === utterance.slice(0, 16),
    );
    if (!skipUserChat && !hasUser) {
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
  }

  return readContextWorkspace(contextEventId) ?? state;
}

/**
 * Prepare a focused trip Workspace map draft and expand it.
 * Sync Search Engine burst — instant pins; browser open path Tool-enriches after.
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

  const compiled = compileTripPrepInput({
    utterance,
    tripPrep: input.tripPrep,
  });
  const inventories = burstFillTripInventory({
    destinationKo: compiled.dest,
    slots: compiled.slots,
    dayCount: compiled.dayCount,
  });
  return writeTripWorkspaceFromInventories({
    utterance,
    contextEventId,
    tripPrep: input.tripPrep,
    expand: input.expand,
    skipUserChat: input.skipUserChat,
    compiled,
    inventories,
    inventoryVia: "sync_search",
  });
}

/**
 * Place Entity materialization — hotel.lookup / restaurant.lookup / maps.search
 * per Day×slot, then rewrite Workspace nodes (photos · price · coords).
 */
export async function prepareTripWorkspaceDraftAsync(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly tripPrep?: TripPrepSlots | null;
  readonly expand?: boolean;
  readonly skipUserChat?: boolean;
  /** When true, rewrite entities only (no chat / soft-next / open events). */
  readonly enrichOnly?: boolean;
}): Promise<ContextWorkspaceState | null> {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) return null;

  const compiled = compileTripPrepInput({
    utterance,
    tripPrep: input.tripPrep,
  });
  const inventories = await burstFillTripInventoryViaTools({
    destinationKo: compiled.dest,
    slots: compiled.slots,
    dayCount: compiled.dayCount,
    contextEventId,
  });
  return writeTripWorkspaceFromInventories({
    utterance,
    contextEventId,
    tripPrep: input.tripPrep,
    expand: input.expand,
    skipUserChat: input.skipUserChat,
    enrichOnly: input.enrichOnly,
    compiled,
    inventories,
    inventoryVia: "tool_registry",
  });
}

/** Whether utterance should auto-prepare a full trip map draft. */
export function shouldPrepareTripWorkspaceDraft(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;

  // Explicit prep verbs (legacy)
  if (
    /여행\s*준비|준비해(?:줘|요|놔|주세요)?|알아서\s*준비|trip\s*prep|일정\s*\S{0,3}\s*(?:짜|세워|만들)|추천\s*일정/iu.test(
      text,
    ) &&
    (/여행|trip|4\s*박|3\s*박|5\s*일|놀러/iu.test(text) ||
      /오사카|제주|도쿄|osaka|jeju/iu.test(text))
  ) {
    return true;
  }

  // Clear trip Intent (same bar as shouldAutoCommitContextCreate) —
  // 「오사카 4박5일」 must stamp Reality Draft, not an empty lodging shell.
  const hasDest =
    Boolean(
      /오사카|제주|도쿄|후쿠오카|나고야|삿포로|osaka|jeju|tokyo|fukuoka/iu.test(
        text,
      ),
    ) || /여행/iu.test(text);
  const hasDuration =
    /\d{1,2}\s*박\s*\d{1,2}\s*일|\d{1,2}\s*박|\d{1,2}\s*일/iu.test(text);
  if (hasDest && hasDuration) {
    // Prefer known destinations so vague 「여행 3일」 alone does not stamp Osaka draft.
    if (
      /오사카|제주|도쿄|후쿠오카|나고야|삿포로|osaka|jeju|tokyo|fukuoka/iu.test(
        text,
      )
    ) {
      return true;
    }
  }
  return false;
}
