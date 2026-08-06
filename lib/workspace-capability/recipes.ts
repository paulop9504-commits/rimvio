/**
 * Intent → which Capability Objects open (AI composition recipes).
 * Fixed app tabs are rejected — only recipe opens matter on first paint.
 */

import type {
  WorkspaceCapabilityIntentId,
  WorkspaceCapabilityRecipe,
} from "@/lib/workspace-capability/types";

/**
 * "오사카 맛집 찾아줘"
 * Open: Search · Candidates · Decision · Compare · Inspector · Map · Agent
 * Closed: flight · budget · trip days · journal
 */
const EATERY_SEARCH: WorkspaceCapabilityRecipe = {
  intentId: "eatery_search",
  labelKo: "맛집 찾기",
  open: [
    { id: "search_summary", slot: "header", order: 0 },
    { id: "candidate_list", slot: "left", order: 0 },
    { id: "map", slot: "center", order: 0 },
    { id: "ai_decision", slot: "right", order: 0 },
    { id: "inspector", slot: "right", order: 1 },
    { id: "compare", slot: "overlay", order: 0 },
    { id: "ai_status", slot: "bottom", order: 0 },
    { id: "commit_gate", slot: "bottom", order: 1 },
  ],
};

/**
 * "오사카 4박5일 일정 만들어줘" — photo-like trip Workspace.
 */
const TRIP_PLAN: WorkspaceCapabilityRecipe = {
  intentId: "trip_plan",
  labelKo: "여행 일정",
  open: [
    { id: "trip_overview", slot: "header", order: 0 },
    { id: "day_rail", slot: "left", order: 0 },
    { id: "candidate_list", slot: "left", order: 1 },
    { id: "map", slot: "center", order: 0 },
    { id: "timeline", slot: "right", order: 0 },
    { id: "budget", slot: "right", order: 1 },
    { id: "booking", slot: "right", order: 2 },
    { id: "weather", slot: "floating", order: 0 },
    { id: "inspector", slot: "right", order: 3 },
    { id: "ai_status", slot: "bottom", order: 0 },
    { id: "commit_gate", slot: "bottom", order: 1 },
  ],
};

/**
 * "호텔 예약해"
 */
const LODGING_BOOK: WorkspaceCapabilityRecipe = {
  intentId: "lodging_book",
  labelKo: "숙소 예약",
  open: [
    { id: "search_summary", slot: "header", order: 0 },
    { id: "candidate_list", slot: "left", order: 0 },
    { id: "map", slot: "center", order: 0 },
    { id: "compare", slot: "overlay", order: 0 },
    { id: "booking", slot: "right", order: 0 },
    { id: "payment", slot: "right", order: 1 },
    { id: "cancellation", slot: "right", order: 2 },
    { id: "inspector", slot: "right", order: 3 },
    { id: "ai_status", slot: "bottom", order: 0 },
    { id: "commit_gate", slot: "bottom", order: 1 },
  ],
};

/**
 * "친구랑 일정 공유"
 */
const SHARE_COLLAB: WorkspaceCapabilityRecipe = {
  intentId: "share_collab",
  labelKo: "일정 공유",
  open: [
    { id: "trip_overview", slot: "header", order: 0 },
    { id: "map", slot: "center", order: 0 },
    { id: "members", slot: "right", order: 0 },
    { id: "permission", slot: "right", order: 1 },
    { id: "suggestion", slot: "right", order: 2 },
    { id: "comments", slot: "right", order: 3 },
    { id: "ai_status", slot: "bottom", order: 0 },
    { id: "commit_gate", slot: "bottom", order: 1 },
  ],
};

/** Fallback — map + agent only (no tab wall). */
const GENERIC_MAP: WorkspaceCapabilityRecipe = {
  intentId: "generic_map",
  labelKo: "지도 작업",
  open: [
    { id: "map", slot: "center", order: 0 },
    { id: "ai_status", slot: "bottom", order: 0 },
    { id: "commit_gate", slot: "bottom", order: 1 },
  ],
};

const BY_INTENT: Readonly<
  Record<WorkspaceCapabilityIntentId, WorkspaceCapabilityRecipe>
> = {
  eatery_search: EATERY_SEARCH,
  trip_plan: TRIP_PLAN,
  lodging_book: LODGING_BOOK,
  share_collab: SHARE_COLLAB,
  generic_map: GENERIC_MAP,
};

export function getWorkspaceCapabilityRecipe(
  intentId: WorkspaceCapabilityIntentId,
): WorkspaceCapabilityRecipe {
  return BY_INTENT[intentId];
}

export function listWorkspaceCapabilityRecipes(): readonly WorkspaceCapabilityRecipe[] {
  return Object.values(BY_INTENT);
}
