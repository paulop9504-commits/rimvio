import { readPendingSituationLock } from "@/lib/experience-run/situation-lock";
import { questionForTravelSlot, nextTravelSlot } from "@/lib/experience-run/travel-context-slots";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import { findNextSellItemFlowStep } from "@/lib/portal/compose-draft/sell-item-flow";
import { classifyGlobeWorkSurface } from "@/lib/work-queue/classify-globe-work-surface";
import {
  listWorkQueueItems,
  removeWorkQueueItem,
  upsertWorkQueueItem,
} from "@/lib/work-queue/work-queue-store";
import type {
  WorkQueueItem,
  WorkQueueItemStatus,
} from "@/lib/work-queue/work-queue-types";

function portalTitle(state: NonNullable<ReturnType<typeof readPortalComposeRunState>>): string {
  const name =
    state.composeDraft?.productName?.trim() ||
    state.marketDraft?.title?.trim() ||
    state.composeSeed.trim();
  if (name) {
    return name;
  }
  if (state.intentId === "offer") {
    return "내놓기";
  }
  if (state.intentId === "seek") {
    return "구하기";
  }
  return "밖 지구";
}

function portalStatus(
  state: NonNullable<ReturnType<typeof readPortalComposeRunState>>,
): WorkQueueItemStatus {
  if (state.status === "waiting_slot" || state.status === "conversing") {
    return "slot_collect";
  }
  const nextFlow = state.composeDraft
    ? findNextSellItemFlowStep(state.composeDraft)
    : null;
  if (nextFlow?.slotKey === "photos") {
    return "ready_media";
  }
  if (state.status === "ready") {
    return "ready_publish";
  }
  return "drafting";
}

function portalNeedsMedia(
  state: NonNullable<ReturnType<typeof readPortalComposeRunState>>,
): boolean {
  const nextFlow = state.composeDraft
    ? findNextSellItemFlowStep(state.composeDraft)
    : null;
  return nextFlow?.slotKey === "photos" || !(state.composeDraft?.photos?.length ?? 0);
}

function syncPortalComposeItem(): WorkQueueItem | null {
  const state = readPortalComposeRunState();
  if (!state) {
    return null;
  }
  if (state.status === "ready" && !portalNeedsMedia(state)) {
    removeWorkQueueItem(state.graphId);
    return null;
  }

  const classification = classifyGlobeWorkSurface(state.composeSeed);
  const item: WorkQueueItem = {
    id: state.graphId,
    graphId: state.graphId,
    kind: "portal_compose",
    surface: "outer",
    titleKo: portalTitle(state),
    subtitleKo:
      state.status === "waiting_slot"
        ? "조건을 더 채워 주세요"
        : portalNeedsMedia(state)
          ? "사진·동영상을 넣으면 올릴 수 있어요"
          : "확인하고 올리기",
    status: portalStatus(state),
    seedMessage: state.composeSeed,
    eventId: state.eventId,
    needsMedia: portalNeedsMedia(state),
    createdAt: state.updatedAt,
    updatedAt: state.updatedAt,
  };
  upsertWorkQueueItem(item);
  return item;
}

function syncTravelContextItem(): WorkQueueItem | null {
  const lock = readPendingSituationLock();
  if (!lock || lock.profile !== "leisure_travel") {
    return null;
  }

  const slots = lock.filledSlots ?? { destination: lock.destination };
  const pending = lock.pendingSlot ?? nextTravelSlot(slots);
  const item: WorkQueueItem = {
    id: `travel:${lock.askedAt}`,
    graphId: `travel:${lock.askedAt}`,
    kind: "travel_context",
    surface: "inner",
    titleKo: slots.destination?.trim()
      ? `${slots.destination} 여행`
      : "여행 맥락",
    subtitleKo: pending
      ? questionForTravelSlot(pending, slots)
      : "맥락을 마저 채워 주세요",
    status: "slot_collect",
    seedMessage: lock.seedMessage,
    eventId: null,
    needsMedia: false,
    createdAt: lock.askedAt,
    updatedAt: new Date().toISOString(),
  };
  upsertWorkQueueItem(item);
  return item;
}

/** Refresh queue from portal compose + travel situation lock SSOT. */
export function syncWorkQueueFromActiveRuns(): WorkQueueItem[] {
  const portal = syncPortalComposeItem();
  const travel = syncTravelContextItem();

  const activeIds = new Set(
    [portal?.id, travel?.id].filter((id): id is string => Boolean(id)),
  );

  for (const row of listWorkQueueItems()) {
    if (
      (row.kind === "portal_compose" || row.kind === "travel_context") &&
      !activeIds.has(row.id)
    ) {
      removeWorkQueueItem(row.id);
    }
  }

  return listWorkQueueItems();
}

export function completeWorkQueueItem(id: string): void {
  removeWorkQueueItem(id);
}
