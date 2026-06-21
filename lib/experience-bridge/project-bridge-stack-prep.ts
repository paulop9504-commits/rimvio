import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import type { ExperienceBridgeState } from "@/lib/experience-bridge/experience-bridge-types";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import { readBridgeSyncPhase } from "@/lib/experience-bridge/bridge-sync-session";
import { projectBridgeCompanionStatus } from "@/lib/experience-bridge/project-bridge-companion-status";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";

export type BridgeStackPrepKind = "invite" | "shared_media" | "upload_pending";

export type BridgeStackPrepItem = {
  id: string;
  kind: BridgeStackPrepKind;
  eventId: string;
  title: string;
  line: string;
  ctaLabel: string;
  href: string;
  priority: number;
};

const DISMISS_KEY = "rimvio.bridge-stack-prep.dismissed";

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.filter((row) => typeof row === "string"));
  } catch {
    return new Set();
  }
}

export function dismissBridgeStackPrep(id: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = new Set(readDismissedIds());
  next.add(id.trim());
  sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
}

function globeRecallHref(eventId: string): string {
  return `/?recallEvent=${encodeURIComponent(eventId.trim())}`;
}

function globeInboxHref(): string {
  return "/?openGlobeInbox=1";
}

function invitePrepItem(invite: PendingBridgeInvite): BridgeStackPrepItem {
  const eventId = invite.state.bridge.eventId.trim();
  const host =
    invite.state.participants.find((row) => row.role === "host")?.displayName?.trim() ||
    copy.globe.bridgeInviteHostFallback;
  const title = invite.state.bridge.title.trim() || copy.globe.bridgeInvitePlaceFallback;
  return {
    id: `invite:${eventId}`,
    kind: "invite",
    eventId,
    title: copy.globe.bridgeStackPrepInviteTitle(host, title),
    line: copy.globe.bridgeStackPrepInviteLine,
    ctaLabel: copy.globe.bridgeStackPrepInviteCta,
    href: globeInboxHref(),
    priority: 100,
  };
}

function eventPrepItem(input: {
  event: EventCandidate;
  viewerUserId?: string | null;
}): BridgeStackPrepItem | null {
  if (!isBridgeSharedEvent(input.event)) {
    return null;
  }
  const eventId = input.event.id.trim();
  const title = input.event.title.trim() || copy.globe.bridgeInvitePlaceFallback;
  const syncPhase = readBridgeSyncPhase(eventId);
  const status = projectBridgeCompanionStatus({
    event: input.event,
    viewerUserId: input.viewerUserId,
    syncPhase,
  });
  if (!status) {
    return null;
  }

  if (status.tone === "uploading" || status.ownUploadPending) {
    return {
      id: `upload:${eventId}`,
      kind: "upload_pending",
      eventId,
      title: copy.globe.bridgeStackPrepUploadTitle(title),
      line: copy.globe.bridgeStackPrepUploadLine,
      ctaLabel: copy.globe.bridgeStackPrepUploadCta,
      href: globeRecallHref(eventId),
      priority: 80,
    };
  }

  if (status.pendingFriendCount > 0) {
    return {
      id: `media:${eventId}:${status.pendingFriendCount}`,
      kind: "shared_media",
      eventId,
      title: copy.globe.bridgeStackPrepMediaTitle(title),
      line: copy.globe.bridgeStackPrepMediaLine(status.pendingFriendCount),
      ctaLabel: copy.globe.bridgeStackPrepMediaCta,
      href: globeRecallHref(eventId),
      priority: 70,
    };
  }

  return null;
}

export function projectBridgeStackPrep(input: {
  invites: readonly PendingBridgeInvite[];
  events: readonly EventCandidate[];
  viewerUserId?: string | null;
  dismissedIds?: ReadonlySet<string>;
}): BridgeStackPrepItem | null {
  const dismissed = input.dismissedIds ?? readDismissedIds();
  const items: BridgeStackPrepItem[] = [];

  for (const invite of input.invites) {
    items.push(invitePrepItem(invite));
  }
  for (const event of input.events) {
    const row = eventPrepItem({
      event,
      viewerUserId: input.viewerUserId,
    });
    if (row) {
      items.push(row);
    }
  }

  const visible = items
    .filter((row) => !dismissed.has(row.id))
    .sort((left, right) => right.priority - left.priority);

  return visible[0] ?? null;
}

/** All non-invite stack prep rows for globe inbox (upload · shared media). */
export function listBridgeStackPrepItems(input: {
  invites: readonly PendingBridgeInvite[];
  events: readonly EventCandidate[];
  viewerUserId?: string | null;
  dismissedIds?: ReadonlySet<string>;
}): BridgeStackPrepItem[] {
  const dismissed = input.dismissedIds ?? readDismissedIds();
  const items: BridgeStackPrepItem[] = [];

  for (const event of input.events) {
    const row = eventPrepItem({
      event,
      viewerUserId: input.viewerUserId,
    });
    if (row) {
      items.push(row);
    }
  }

  return items
    .filter((row) => !dismissed.has(row.id))
    .sort((left, right) => right.priority - left.priority);
}

export function listBridgeLinkedEvents(
  events: readonly EventCandidate[],
): EventCandidate[] {
  return events.filter((event) => isBridgeSharedEvent(event));
}

export type { ExperienceBridgeState };
