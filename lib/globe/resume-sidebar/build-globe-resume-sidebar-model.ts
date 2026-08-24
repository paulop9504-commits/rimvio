/**
 * Globe Resume sidebar model — Workspace vs Friends stay separate (ADR-047).
 */

import {
  listCapsuleProjections,
  type CapsuleProjection,
} from "@/lib/context-workspace/resume-capsule-workspace";
import { domainLabelKo } from "@/lib/context-workspace/types";
import {
  readContextWorkspace,
  readContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { listGlobeContextTimeline } from "@/lib/globe/list-globe-context-timeline";
import {
  formatResumeRelativeTime,
  isResumeLiveActivity,
} from "@/lib/globe/resume-sidebar/format-resume-relative-time";
import { collectManagedLiveWorks } from "@/lib/globe/live-work/collect-managed-sidebar-rows";
import type { LiveWork, LiveWorkPhase } from "@/lib/globe/live-work/types";
import { listPinnedWorkspaceIds } from "@/lib/globe/resume-sidebar/pinned-workspace-ids";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { listPeersForTalk } from "@/lib/peer-chat/list-peers-for-talk";

export type ResumeWorkspaceRow = {
  readonly kind: "workspace";
  readonly contextEventId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly relativeLabel: string;
  readonly live: boolean;
  readonly pinned: boolean;
  readonly updatedAtIso: string;
  readonly workPhase?: LiveWorkPhase;
  readonly liveWorkId?: string;
};

export type ResumeFriendRow = {
  readonly kind: "friend";
  readonly peerThreadId: string;
  readonly title: string;
  readonly preview: string | null;
  readonly relativeLabel: string;
  readonly live: boolean;
  readonly unreadCount: number;
  readonly updatedAtIso: string;
};

export type GlobeResumeSidebarModel = {
  readonly inProgress: readonly ResumeWorkspaceRow[];
  readonly pinned: readonly ResumeWorkspaceRow[];
  readonly friends: readonly ResumeFriendRow[];
  readonly recent: readonly ResumeWorkspaceRow[];
};

function liveWorkToRow(work: LiveWork): ResumeWorkspaceRow {
  const mark =
    work.phase === "needs_approval"
      ? "◉"
      : work.phase === "waiting_pc"
        ? "⏸"
        : work.phase === "running"
          ? "●"
          : "✓";
  return {
    kind: "workspace",
    contextEventId: work.contextEventId,
    title: `${work.glyph} ${work.title}`.trim(),
    subtitle: work.statusLine,
    relativeLabel: mark,
    live:
      work.phase === "running" ||
      work.phase === "needs_approval" ||
      work.phase === "waiting_pc",
    pinned: false,
    updatedAtIso: work.updatedAtIso,
    workPhase: work.phase,
    liveWorkId: work.id,
  };
}

function capsuleToRow(
  capsule: CapsuleProjection,
  pinned: boolean,
  nowMs: number,
): ResumeWorkspaceRow {
  return {
    kind: "workspace",
    contextEventId: capsule.contextEventId,
    title: capsule.labelKo,
    subtitle: capsule.domainKo,
    relativeLabel: formatResumeRelativeTime(capsule.updatedAtIso, nowMs),
    live:
      readContextWorkspaceExpanded(capsule.contextEventId) ||
      isResumeLiveActivity(capsule.updatedAtIso, nowMs),
    pinned,
    updatedAtIso: capsule.updatedAtIso,
  };
}

function timelineToWorkspaceRow(
  entry: GlobeContextTimelineEntry,
  pinned: boolean,
  nowMs: number,
): ResumeWorkspaceRow | null {
  const state = readContextWorkspace(entry.eventId);
  if (state?.status === "closed") return null;
  const updatedAtIso =
    state?.updatedAtIso ??
    (entry.sortMs ? new Date(entry.sortMs).toISOString() : new Date().toISOString());
  return {
    kind: "workspace",
    contextEventId: entry.eventId,
    title: entry.title.trim() || state?.summaryKo?.trim() || "작업",
    subtitle: entry.place || entry.rangeLabel || entry.dateLabel || "맥락",
    relativeLabel: formatResumeRelativeTime(updatedAtIso, nowMs),
    live:
      readContextWorkspaceExpanded(entry.eventId) ||
      isResumeLiveActivity(updatedAtIso, nowMs),
    pinned,
    updatedAtIso,
  };
}

export function buildGlobeResumeSidebarModel(input?: {
  readonly activeEventId?: string | null;
  readonly socialPeers?: readonly SocialBubblePeer[] | null;
  readonly nowMs?: number;
  readonly maxPinned?: number;
  readonly maxFriends?: number;
  readonly maxRecent?: number;
}): GlobeResumeSidebarModel {
  const nowMs = input?.nowMs ?? Date.now();
  const maxPinned = input?.maxPinned ?? 6;
  const maxFriends = input?.maxFriends ?? 8;
  const maxRecent = input?.maxRecent ?? 10;

  const managed = collectManagedLiveWorks(nowMs);
  const occupied = new Set(managed.occupiedIds);
  const inProgress: ResumeWorkspaceRow[] = managed.inProgress.map(liveWorkToRow);

  const pinSet = new Set(listPinnedWorkspaceIds());

  const capsules = [...listCapsuleProjections()].sort((a, b) =>
    b.updatedAtIso.localeCompare(a.updatedAtIso),
  );
  const capsuleById = new Map(capsules.map((c) => [c.contextEventId, c] as const));

  for (const capsule of capsules) {
    if (occupied.has(capsule.contextEventId)) continue;
    if (
      !capsule.hasPendingAgentPlan &&
      !readContextWorkspaceExpanded(capsule.contextEventId)
    ) {
      continue;
    }
    inProgress.push({
      ...capsuleToRow(capsule, false, nowMs),
      live: true,
      relativeLabel: "●",
      workPhase: "running",
    });
    occupied.add(capsule.contextEventId);
  }

  const pinnedRows: ResumeWorkspaceRow[] = [];
  for (const id of pinSet) {
    const capsule = capsuleById.get(id);
    if (capsule) {
      if (occupied.has(id)) continue;
      pinnedRows.push(capsuleToRow(capsule, true, nowMs));
      occupied.add(id);
      continue;
    }
    const state = readContextWorkspace(id);
    if (state && state.status !== "closed") {
      if (occupied.has(id)) continue;
      pinnedRows.push({
        kind: "workspace",
        contextEventId: id,
        title: state.summaryKo.trim() || state.query.trim() || "작업",
        subtitle: domainLabelKo(state.domain),
        relativeLabel: formatResumeRelativeTime(state.updatedAtIso, nowMs),
        live:
          readContextWorkspaceExpanded(id) ||
          isResumeLiveActivity(state.updatedAtIso, nowMs),
        pinned: true,
        updatedAtIso: state.updatedAtIso,
      });
      occupied.add(id);
    }
  }

  const pinnedIds = new Set(pinnedRows.map((r) => r.contextEventId));
  const recentRows: ResumeWorkspaceRow[] = managed.recentlySettled.map(liveWorkToRow);
  for (const capsule of capsules) {
    if (occupied.has(capsule.contextEventId)) continue;
    if (pinnedIds.has(capsule.contextEventId)) continue;
    recentRows.push(capsuleToRow(capsule, false, nowMs));
  }

  const timeline = listGlobeContextTimeline(listLifeEventCandidates());
  const flat = [...timeline.present, ...timeline.future, ...timeline.past]
    .sort((a, b) => b.sortMs - a.sortMs)
    .slice(0, 24);
  for (const entry of flat) {
    if (occupied.has(entry.eventId)) continue;
    if (pinnedIds.has(entry.eventId)) continue;
    if (recentRows.some((r) => r.contextEventId === entry.eventId)) continue;
    const row = timelineToWorkspaceRow(entry, false, nowMs);
    if (row) recentRows.push(row);
  }
  recentRows.sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));

  const friends: ResumeFriendRow[] = [];
  const social = input?.socialPeers ?? [];
  if (social.length > 0) {
    const ordered = [...social].sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return b.lastInteractionAt.localeCompare(a.lastInteractionAt);
    });
    for (const peer of ordered.slice(0, maxFriends)) {
      friends.push({
        kind: "friend",
        peerThreadId: peer.threadId,
        title: peer.displayName.trim() || "친구",
        preview:
          peer.unreadCount > 0 ? `안 읽은 메시지 ${peer.unreadCount}` : null,
        relativeLabel: formatResumeRelativeTime(peer.lastInteractionAt, nowMs),
        live:
          peer.bubbleState !== "idle" ||
          peer.unreadCount > 0 ||
          isResumeLiveActivity(peer.lastInteractionAt, nowMs),
        unreadCount: peer.unreadCount,
        updatedAtIso: peer.lastInteractionAt,
      });
    }
  } else {
    for (const peer of listPeersForTalk().slice(0, maxFriends)) {
      const updatedAtIso = peer.updatedAt ?? peer.createdAt;
      friends.push({
        kind: "friend",
        peerThreadId: peer.peerThreadId,
        title:
          peer.roomDisplayName?.trim() || peer.displayName.trim() || "친구",
        preview: null,
        relativeLabel: formatResumeRelativeTime(updatedAtIso, nowMs),
        live: isResumeLiveActivity(updatedAtIso, nowMs),
        unreadCount: 0,
        updatedAtIso,
      });
    }
  }

  return {
    inProgress,
    pinned: pinnedRows.slice(0, maxPinned),
    friends,
    recent: recentRows.slice(0, maxRecent),
  };
}
