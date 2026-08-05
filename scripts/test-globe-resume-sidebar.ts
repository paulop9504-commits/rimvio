#!/usr/bin/env npx tsx
/**
 * Globe Resume sidebar — Workspace vs Friends stay separate kinds.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatResumeRelativeTime,
  isResumeLiveActivity,
} from "@/lib/globe/resume-sidebar/format-resume-relative-time";
import { buildGlobeResumeSidebarModel } from "@/lib/globe/resume-sidebar/build-globe-resume-sidebar-model";
import {
  pinWorkspaceId,
  listPinnedWorkspaceIds,
  unpinWorkspaceId,
} from "@/lib/globe/resume-sidebar/pinned-workspace-ids";

const now = Date.parse("2026-08-05T10:00:00+09:00");
assert.equal(formatResumeRelativeTime(new Date(now - 5 * 60_000).toISOString(), now), "5m");
assert.equal(formatResumeRelativeTime(new Date(now - 2 * 3600_000).toISOString(), now), "2h");
assert.equal(isResumeLiveActivity(new Date(now - 60_000).toISOString(), now), true);
assert.equal(isResumeLiveActivity(new Date(now - 20 * 60_000).toISOString(), now), false);

const pinId = "ctx_resume_pin_test";
unpinWorkspaceId(pinId);
pinWorkspaceId(pinId);
assert.ok(listPinnedWorkspaceIds().includes(pinId));
unpinWorkspaceId(pinId);
assert.ok(!listPinnedWorkspaceIds().includes(pinId));

const model = buildGlobeResumeSidebarModel({
  nowMs: now,
  socialPeers: [
    {
      friendId: "f1",
      threadId: "thread_jay",
      displayName: "Jay",
      rimvioId: null,
      avatarUrl: null,
      bubbleState: "active",
      isPinned: true,
      pinSlot: 0,
      unreadCount: 2,
      lastInteractionAt: new Date(now - 30_000).toISOString(),
      messagesPurgeAfter: null,
    },
  ],
});

assert.ok(Array.isArray(model.pinned));
assert.ok(Array.isArray(model.friends));
assert.ok(Array.isArray(model.recent));
assert.equal(model.friends[0]?.kind, "friend");
assert.equal(model.friends[0]?.peerThreadId, "thread_jay");
assert.ok(model.friends.every((row) => row.kind === "friend"));
assert.ok(model.pinned.every((row) => row.kind === "workspace"));
assert.ok(model.recent.every((row) => row.kind === "workspace"));

const list = readFileSync(
  join(process.cwd(), "components/globe/globe-resume-sidebar-list.tsx"),
  "utf8",
);
assert.ok(list.includes('data-resume-kind="workspace"'));
assert.ok(list.includes('data-resume-kind="friend"'));
assert.ok(list.includes("resumeCapsuleWorkspace"));
assert.ok(list.includes("/peers/"));

const shell = readFileSync(
  join(process.cwd(), "components/globe/globe-container-space-sidebar.tsx"),
  "utf8",
);
assert.ok(shell.includes("GlobeResumeSidebarList"));

console.log("ok — globe resume sidebar");
