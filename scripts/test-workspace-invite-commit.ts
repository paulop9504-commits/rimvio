#!/usr/bin/env npx tsx
/**
 * Workspace invite ✓ → Shared Workspace Commit (not Reality booking).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  writeSharedWorkspaceSession,
  readSharedWorkspaceSession,
  listSharedWorkspaceSessions,
} from "@/lib/context-workspace/shared-workspace-session-store";

const bridgeEventId = "bridge_invite_commit_test";
writeSharedWorkspaceSession({
  contextEventId: bridgeEventId,
  bridgeEventId,
  title: "Osaka Trip",
  hostDisplayName: "Jay",
  peerThreadId: "thread_1",
  committedAtIso: new Date().toISOString(),
  syncActive: true,
});

const session = readSharedWorkspaceSession(bridgeEventId);
assert.ok(session);
assert.equal(session.title, "Osaka Trip");
assert.equal(session.syncActive, true);
assert.ok(listSharedWorkspaceSessions().some((s) => s.bridgeEventId === bridgeEventId));

const commit = readFileSync(
  join(process.cwd(), "lib/context-workspace/commit-workspace-invite-accept.ts"),
  "utf8",
);
assert.ok(commit.includes("completeBridgeInviteAccept"));
assert.ok(commit.includes("writeSharedWorkspaceSession"));
assert.ok(commit.includes("workspace_invite_commit"));
assert.ok(!commit.includes("assertHumanCommit"));

const section = readFileSync(
  join(process.cwd(), "components/globe/globe-resume-invite-section.tsx"),
  "utf8",
);
assert.ok(section.includes("data-resume-invite-accept"));
assert.ok(section.includes("data-resume-invite-decline"));
assert.ok(section.includes("commitWorkspaceInviteAccept"));

const shell = readFileSync(
  join(process.cwd(), "components/globe/globe-container-space-sidebar.tsx"),
  "utf8",
);
assert.ok(shell.includes("GlobeResumeInviteSection"));
assert.ok(shell.includes("GlobeResumeSidebarList"));

const realtime = readFileSync(
  join(process.cwd(), "hooks/use-shared-workspace-realtime-sync.ts"),
  "utf8",
);
assert.ok(realtime.includes("experience_bridge_participants"));
assert.ok(realtime.includes("experience_bridge_contributions"));

console.log("ok — workspace invite commit sidebar");
