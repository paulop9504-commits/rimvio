/**
 * Per-Context share roster (Sheets people list). ADR-047.
 */

import type {
  ContextShareMember,
  ContextShareRole,
  ContextShareRoster,
} from "@/lib/context-workspace/rts-share/types";

export const CONTEXT_SHARE_ROSTER_UPDATED =
  "rimvio:context-share-roster-updated";

const STORAGE_KEY = "rimvio-context-share-rosters";
const memory = new Map<string, ContextShareRoster>();

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hydrate(): void {
  if (memory.size > 0) return;
  const store = storage();
  if (!store) return;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as ContextShareRoster;
      if (typeof r.contextEventId !== "string" || !r.contextEventId.trim()) continue;
      memory.set(r.contextEventId.trim(), r);
    }
  } catch {
    // ignore
  }
}

function persist(): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify([...memory.values()]));
  } catch {
    // ignore
  }
}

function emit(contextEventId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CONTEXT_SHARE_ROSTER_UPDATED, {
      detail: { contextEventId },
    }),
  );
}

export function readContextShareRoster(
  contextEventId: string,
): ContextShareRoster | null {
  hydrate();
  return memory.get(contextEventId.trim()) ?? null;
}

export function ensureContextShareRoster(input: {
  readonly contextEventId: string;
  readonly mapOwnerUserId: string;
  readonly mapOwnerDisplayName: string;
}): ContextShareRoster {
  const key = input.contextEventId.trim();
  const ownerId = input.mapOwnerUserId.trim();
  if (!key || !ownerId) throw new Error("share_roster_ids_required");
  hydrate();
  const existing = memory.get(key);
  const now = new Date().toISOString();
  if (existing) {
    const hasOwner = existing.members.some(
      (m) => m.userId === ownerId && m.role === "map_owner",
    );
    if (hasOwner) return existing;
    const members: ContextShareMember[] = [
      {
        userId: ownerId,
        displayName: input.mapOwnerDisplayName.trim() || "나",
        peerThreadId: null,
        role: "map_owner",
        status: "active",
        invitedAtIso: now,
        joinedAtIso: now,
      },
      ...existing.members.filter((m) => m.userId !== ownerId),
    ];
    const next: ContextShareRoster = {
      ...existing,
      mapOwnerUserId: ownerId,
      members,
      updatedAtIso: now,
    };
    memory.set(key, next);
    persist();
    emit(key);
    return next;
  }

  const next: ContextShareRoster = {
    contextEventId: key,
    mapOwnerUserId: ownerId,
    members: [
      {
        userId: ownerId,
        displayName: input.mapOwnerDisplayName.trim() || "나",
        peerThreadId: null,
        role: "map_owner",
        status: "active",
        invitedAtIso: now,
        joinedAtIso: now,
      },
    ],
    updatedAtIso: now,
  };
  memory.set(key, next);
  persist();
  emit(key);
  return next;
}

export function upsertContextShareMember(input: {
  readonly contextEventId: string;
  readonly member: Omit<ContextShareMember, "invitedAtIso" | "joinedAtIso"> & {
    readonly invitedAtIso?: string;
    readonly joinedAtIso?: string | null;
  };
}): ContextShareRoster {
  const key = input.contextEventId.trim();
  hydrate();
  const prev = memory.get(key);
  if (!prev) throw new Error("share_roster_missing");
  const now = new Date().toISOString();
  const member: ContextShareMember = {
    userId: input.member.userId.trim(),
    displayName: input.member.displayName.trim() || "친구",
    peerThreadId: input.member.peerThreadId,
    role: input.member.role,
    status: input.member.status,
    invitedAtIso: input.member.invitedAtIso ?? now,
    joinedAtIso:
      input.member.joinedAtIso === undefined
        ? input.member.status === "active"
          ? now
          : null
        : input.member.joinedAtIso,
  };
  if (!member.userId) throw new Error("share_member_user_required");
  if (member.role === "map_owner" && member.userId !== prev.mapOwnerUserId) {
    throw new Error("share_cannot_promote_map_owner_here");
  }
  const next: ContextShareRoster = {
    ...prev,
    members: [...prev.members.filter((m) => m.userId !== member.userId), member],
    updatedAtIso: now,
  };
  memory.set(key, next);
  persist();
  emit(key);
  return next;
}

export function setContextShareMemberRole(input: {
  readonly contextEventId: string;
  readonly userId: string;
  readonly role: ContextShareRole;
  readonly actorUserId: string;
}): ContextShareRoster {
  const roster = readContextShareRoster(input.contextEventId);
  if (!roster) throw new Error("share_roster_missing");
  if (roster.mapOwnerUserId !== input.actorUserId.trim()) {
    throw new Error("share_only_map_owner_changes_roles");
  }
  const userId = input.userId.trim();
  if (userId === roster.mapOwnerUserId) {
    throw new Error("share_cannot_demote_map_owner");
  }
  if (input.role === "map_owner") {
    throw new Error("share_cannot_promote_map_owner_here");
  }
  const member = roster.members.find((m) => m.userId === userId);
  if (!member) throw new Error("share_member_missing");
  return upsertContextShareMember({
    contextEventId: input.contextEventId,
    member: { ...member, role: input.role },
  });
}

export function removeContextShareMember(input: {
  readonly contextEventId: string;
  readonly userId: string;
  readonly actorUserId: string;
}): ContextShareRoster {
  const key = input.contextEventId.trim();
  const roster = readContextShareRoster(key);
  if (!roster) throw new Error("share_roster_missing");
  if (roster.mapOwnerUserId !== input.actorUserId.trim()) {
    throw new Error("share_only_map_owner_removes");
  }
  const userId = input.userId.trim();
  if (userId === roster.mapOwnerUserId) {
    throw new Error("share_cannot_remove_map_owner");
  }
  const next: ContextShareRoster = {
    ...roster,
    members: roster.members.filter((m) => m.userId !== userId),
    updatedAtIso: new Date().toISOString(),
  };
  memory.set(key, next);
  persist();
  emit(key);
  return next;
}

export function activateContextShareMemberOnAccept(input: {
  readonly contextEventId: string;
  readonly userId: string;
}): void {
  const roster = readContextShareRoster(input.contextEventId);
  if (!roster) return;
  const member = roster.members.find((m) => m.userId === input.userId.trim());
  if (!member || member.status === "active") return;
  upsertContextShareMember({
    contextEventId: input.contextEventId,
    member: {
      ...member,
      status: "active",
      joinedAtIso: new Date().toISOString(),
    },
  });
}
