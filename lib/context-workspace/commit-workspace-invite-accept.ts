/**
 * Workspace Invite Commit — accept ✓ → Shared Workspace + sync start.
 * NOT Reality Commit (payment / reserve). ADR-047.
 */

import { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
import type { ExperienceBridgeState } from "@/lib/experience-bridge/experience-bridge-types";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  readContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import {
  writeSharedWorkspaceSession,
  type SharedWorkspaceSession,
} from "@/lib/context-workspace/shared-workspace-session-store";
import { activateContextShareMemberOnAccept } from "@/lib/context-workspace/rts-share/context-share-roster-store";
import { createEmptySharedGlobe } from "@/lib/shared-globe/create-empty-shared-globe";

export type WorkspaceInviteCommitResult = {
  readonly ok: true;
  readonly session: SharedWorkspaceSession;
  readonly contextEventId: string;
};

export async function commitWorkspaceInviteAccept(input: {
  readonly state: ExperienceBridgeState;
  readonly peerThreadId?: string | null;
  readonly viewerUserId?: string | null;
  readonly viewerDisplayName?: string | null;
}): Promise<WorkspaceInviteCommitResult> {
  const bridge = input.state.bridge;
  const eventId = bridge.eventId.trim();
  if (!eventId) throw new Error("bridge_event_missing");

  await completeBridgeInviteAccept({
    state: input.state,
    peerThreadId: input.peerThreadId ?? bridge.peerThreadId,
    viewerUserId: input.viewerUserId,
  });

  const title =
    bridge.title?.trim() ||
    bridge.placeLabel?.trim() ||
    bridge.eventSnapshot?.title?.trim() ||
    null;
  const host =
    input.state.participants.find((p) => p.role === "host")?.displayName?.trim() ||
    "친구";

  let workspace = readContextWorkspace(eventId);
  if (!workspace || workspace.status === "closed") {
    openMapContextWorkspace({
      contextEventId: eventId,
      domain: "poi",
      query: title,
      summaryKo: title,
      candidates: [],
      source: "bridge_invite_commit",
    });
    workspace = readContextWorkspace(eventId);
  }

  if (workspace) {
    writeContextWorkspaceExpanded(eventId, true);
    dispatchContextWorkspaceExpand({
      contextEventId: eventId,
      source: "workspace_invite_commit",
    });
  }

  const snapshot = bridge.eventSnapshot;
  const threadId =
    (input.peerThreadId ?? bridge.peerThreadId)?.trim() || eventId;
  if (snapshot && typeof snapshot === "object") {
    try {
      createEmptySharedGlobe({
        primaryEvent: snapshot,
        threadId,
        ownerDisplayName: host,
        ownerUserId: bridge.hostUserId,
        invitedMembers: [
          {
            displayName:
              input.viewerDisplayName?.trim() ||
              input.state.participants.find((p) => p.userId === input.viewerUserId)
                ?.displayName ||
              "나",
            userId: input.viewerUserId ?? undefined,
            role: "member",
            joinedAt: new Date().toISOString(),
          },
        ],
      });
    } catch {
      // best-effort
    }
  }

  const session: SharedWorkspaceSession = {
    contextEventId: eventId,
    bridgeEventId: eventId,
    title,
    hostDisplayName: host,
    peerThreadId: input.peerThreadId ?? bridge.peerThreadId ?? null,
    committedAtIso: new Date().toISOString(),
    syncActive: true,
  };
  writeSharedWorkspaceSession(session);

  if (input.viewerUserId?.trim()) {
    activateContextShareMemberOnAccept({
      contextEventId: eventId,
      userId: input.viewerUserId,
    });
  }

  return { ok: true, session, contextEventId: eventId };
}
