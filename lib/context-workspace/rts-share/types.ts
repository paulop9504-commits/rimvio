/**
 * Context Map roster roles — Sheets-style settings UI, RTS semantics (ADR-047).
 */

export const CONTEXT_SHARE_ROLES = [
  "map_owner",
  "player",
  "suggest",
  "viewer",
] as const;

export type ContextShareRole = (typeof CONTEXT_SHARE_ROLES)[number];

export type ContextShareMember = {
  readonly userId: string;
  readonly displayName: string;
  readonly peerThreadId: string | null;
  readonly role: ContextShareRole;
  readonly status: "pending" | "active" | "removed";
  readonly invitedAtIso: string;
  readonly joinedAtIso: string | null;
};

export type ContextShareRoster = {
  readonly contextEventId: string;
  readonly mapOwnerUserId: string;
  readonly members: readonly ContextShareMember[];
  readonly updatedAtIso: string;
};

export function contextShareRoleLabelKo(role: ContextShareRole): string {
  switch (role) {
    case "map_owner":
      return "소유자";
    case "player":
      return "편집 · 내 단위만";
    case "suggest":
      return "제안";
    case "viewer":
      return "보기";
    default:
      return role;
  }
}

export function contextShareRoleHintKo(role: ContextShareRole): string {
  switch (role) {
    case "map_owner":
      return "맵 공유 · 역할 · 단위 확정 권한";
    case "player":
      return "내 단위만 편집·확정 가능";
    case "suggest":
      return "핑·제안만 (남의 단위 편집 불가)";
    case "viewer":
      return "읽기 전용";
    default:
      return "";
  }
}

export const ASSIGNABLE_SHARE_ROLES: readonly ContextShareRole[] = [
  "player",
  "suggest",
  "viewer",
];
