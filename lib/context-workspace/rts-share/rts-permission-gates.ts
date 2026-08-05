/**
 * RTS permission gates — Sheets roles × Object ownership (ADR-047).
 */

import { readContextShareRoster } from "@/lib/context-workspace/rts-share/context-share-roster-store";
import type { ContextShareRole } from "@/lib/context-workspace/rts-share/types";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

function roleOf(
  contextEventId: string,
  userId: string | null | undefined,
): ContextShareRole | null {
  const id = userId?.trim();
  if (!id) return null;
  const roster = readContextShareRoster(contextEventId);
  if (!roster) return "map_owner";
  const member = roster.members.find(
    (m) => m.userId === id && m.status !== "removed",
  );
  return member?.role ?? null;
}

export function canManageContextShare(input: {
  readonly contextEventId: string;
  readonly userId: string | null | undefined;
}): boolean {
  return roleOf(input.contextEventId, input.userId) === "map_owner";
}

export function canViewSharedWorkspace(input: {
  readonly contextEventId: string;
  readonly userId: string | null | undefined;
}): boolean {
  return roleOf(input.contextEventId, input.userId) != null;
}

export function canProposeOnMap(input: {
  readonly contextEventId: string;
  readonly userId: string | null | undefined;
}): boolean {
  const role = roleOf(input.contextEventId, input.userId);
  return role === "map_owner" || role === "player" || role === "suggest";
}

export function canEditWorkspaceObject(input: {
  readonly contextEventId: string;
  readonly userId: string | null | undefined;
  readonly node: Pick<ContextWorkspaceNode, "ownerUserId">;
}): boolean {
  const uid = input.userId?.trim();
  if (!uid) return false;
  const role = roleOf(input.contextEventId, uid);
  if (role !== "map_owner" && role !== "player") return false;
  const owner = input.node.ownerUserId?.trim();
  if (!owner) return role === "map_owner";
  return owner === uid;
}

export function canPayOrReserveObject(input: {
  readonly contextEventId: string;
  readonly userId: string | null | undefined;
  readonly node: Pick<ContextWorkspaceNode, "ownerUserId">;
}): boolean {
  return canEditWorkspaceObject(input);
}

export function ownershipMarkForNode(input: {
  readonly viewerUserId: string | null | undefined;
  readonly node: Pick<ContextWorkspaceNode, "ownerUserId">;
}): "mine" | "companion" | "shared" {
  const owner = input.node.ownerUserId?.trim();
  if (!owner) return "shared";
  if (owner === input.viewerUserId?.trim()) return "mine";
  return "companion";
}
