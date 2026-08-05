/**
 * Capability Object catalog — SSOT of what can be opened in a Workspace.
 */

import type {
  WorkspaceCapabilityDef,
  WorkspaceCapabilityId,
} from "@/lib/workspace-capability/types";

const DEFS: readonly WorkspaceCapabilityDef[] = [
  {
    id: "search_summary",
    labelKo: "검색 요약",
    labelEn: "Search summary",
    defaultSlot: "header",
    defaultSize: "md",
    kind: "discover",
  },
  {
    id: "candidate_list",
    labelKo: "후보 리스트",
    labelEn: "Candidates",
    defaultSlot: "left",
    defaultSize: "md",
    kind: "discover",
  },
  {
    id: "ai_decision",
    labelKo: "AI Decision",
    labelEn: "AI Decision",
    defaultSlot: "right",
    defaultSize: "sm",
    kind: "discover",
  },
  {
    id: "compare",
    labelKo: "Compare",
    labelEn: "Compare",
    defaultSlot: "overlay",
    defaultSize: "lg",
    kind: "discover",
  },
  {
    id: "inspector",
    labelKo: "Inspector",
    labelEn: "Inspector",
    defaultSlot: "right",
    defaultSize: "md",
    kind: "discover",
  },
  {
    id: "trip_overview",
    labelKo: "여행 개요",
    labelEn: "Trip overview",
    defaultSlot: "header",
    defaultSize: "md",
    kind: "plan",
  },
  {
    id: "day_rail",
    labelKo: "Day",
    labelEn: "Day rail",
    defaultSlot: "left",
    defaultSize: "md",
    kind: "plan",
  },
  {
    id: "map",
    labelKo: "지도",
    labelEn: "Map",
    defaultSlot: "center",
    defaultSize: "fill",
    kind: "plan",
  },
  {
    id: "timeline",
    labelKo: "Timeline",
    labelEn: "Timeline",
    defaultSlot: "right",
    defaultSize: "lg",
    kind: "plan",
  },
  {
    id: "budget",
    labelKo: "예산",
    labelEn: "Budget",
    defaultSlot: "right",
    defaultSize: "sm",
    kind: "plan",
  },
  {
    id: "booking",
    labelKo: "예약",
    labelEn: "Booking",
    defaultSlot: "right",
    defaultSize: "md",
    kind: "book",
  },
  {
    id: "weather",
    labelKo: "날씨",
    labelEn: "Weather",
    defaultSlot: "floating",
    defaultSize: "sm",
    kind: "plan",
  },
  {
    id: "traffic",
    labelKo: "교통",
    labelEn: "Traffic",
    defaultSlot: "floating",
    defaultSize: "sm",
    kind: "plan",
  },
  {
    id: "payment",
    labelKo: "결제",
    labelEn: "Payment",
    defaultSlot: "right",
    defaultSize: "md",
    kind: "book",
  },
  {
    id: "cancellation",
    labelKo: "취소 정책",
    labelEn: "Cancellation",
    defaultSlot: "right",
    defaultSize: "sm",
    kind: "book",
  },
  {
    id: "members",
    labelKo: "멤버",
    labelEn: "Members",
    defaultSlot: "right",
    defaultSize: "md",
    kind: "collab",
  },
  {
    id: "permission",
    labelKo: "권한",
    labelEn: "Permission",
    defaultSlot: "right",
    defaultSize: "sm",
    kind: "collab",
  },
  {
    id: "suggestion",
    labelKo: "제안",
    labelEn: "Suggestion",
    defaultSlot: "right",
    defaultSize: "md",
    kind: "collab",
  },
  {
    id: "comments",
    labelKo: "댓글",
    labelEn: "Comments",
    defaultSlot: "right",
    defaultSize: "md",
    kind: "collab",
  },
  {
    id: "journal",
    labelKo: "Journal",
    labelEn: "Journal",
    defaultSlot: "overlay",
    defaultSize: "lg",
    kind: "plan",
  },
  {
    id: "history",
    labelKo: "History",
    labelEn: "History",
    defaultSlot: "overlay",
    defaultSize: "md",
    kind: "system",
  },
  {
    id: "analytics",
    labelKo: "Analytics",
    labelEn: "Analytics",
    defaultSlot: "overlay",
    defaultSize: "md",
    kind: "system",
  },
  {
    id: "ai_status",
    labelKo: "Agent",
    labelEn: "Agent",
    defaultSlot: "bottom",
    defaultSize: "md",
    kind: "system",
  },
  {
    id: "commit_gate",
    labelKo: "Commit",
    labelEn: "Commit",
    defaultSlot: "bottom",
    defaultSize: "sm",
    kind: "system",
  },
];

const BY_ID = new Map(DEFS.map((d) => [d.id, d]));

export function listWorkspaceCapabilities(): readonly WorkspaceCapabilityDef[] {
  return DEFS;
}

export function getWorkspaceCapability(
  id: WorkspaceCapabilityId,
): WorkspaceCapabilityDef {
  const hit = BY_ID.get(id);
  if (!hit) {
    throw new Error(`Unknown workspace capability: ${id}`);
  }
  return hit;
}

export function isWorkspaceCapabilityId(
  value: string,
): value is WorkspaceCapabilityId {
  return BY_ID.has(value as WorkspaceCapabilityId);
}
