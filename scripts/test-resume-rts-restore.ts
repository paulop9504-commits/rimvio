#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ensureContextShareRoster,
  upsertContextShareMember,
  setContextShareMemberRole,
  readContextShareRoster,
} from "@/lib/context-workspace/rts-share/context-share-roster-store";
import {
  canEditWorkspaceObject,
  canManageContextShare,
  canPayOrReserveObject,
  ownershipMarkForNode,
} from "@/lib/context-workspace/rts-share/rts-permission-gates";
import { buildGlobeResumeSidebarModel } from "@/lib/globe/resume-sidebar/build-globe-resume-sidebar-model";
import {
  writeSharedWorkspaceSession,
  readSharedWorkspaceSession,
} from "@/lib/context-workspace/shared-workspace-session-store";

const CTX = "ctx_restore_rts";
const OWNER = "user_owner";
const FRIEND = "user_friend";

ensureContextShareRoster({
  contextEventId: CTX,
  mapOwnerUserId: OWNER,
  mapOwnerDisplayName: "성용",
});
upsertContextShareMember({
  contextEventId: CTX,
  member: {
    userId: FRIEND,
    displayName: "지은",
    peerThreadId: "t1",
    role: "player",
    status: "pending",
  },
});
setContextShareMemberRole({
  contextEventId: CTX,
  userId: FRIEND,
  role: "suggest",
  actorUserId: OWNER,
});
assert.equal(readContextShareRoster(CTX)?.members.find((m) => m.userId === FRIEND)?.role, "suggest");
assert.equal(canManageContextShare({ contextEventId: CTX, userId: OWNER }), true);
assert.equal(canManageContextShare({ contextEventId: CTX, userId: FRIEND }), false);
assert.equal(
  canEditWorkspaceObject({
    contextEventId: CTX,
    userId: FRIEND,
    node: { ownerUserId: OWNER },
  }),
  false,
);
assert.equal(
  canPayOrReserveObject({
    contextEventId: CTX,
    userId: OWNER,
    node: { ownerUserId: OWNER },
  }),
  true,
);
assert.equal(
  ownershipMarkForNode({ viewerUserId: OWNER, node: { ownerUserId: null } }),
  "shared",
);

const model = buildGlobeResumeSidebarModel({ nowMs: Date.now(), socialPeers: [] });
assert.ok(Array.isArray(model.pinned));
assert.ok(Array.isArray(model.friends));
assert.ok(Array.isArray(model.recent));

writeSharedWorkspaceSession({
  contextEventId: "b1",
  bridgeEventId: "b1",
  title: "Osaka",
  hostDisplayName: "Jay",
  peerThreadId: null,
  committedAtIso: new Date().toISOString(),
  syncActive: true,
});
assert.ok(readSharedWorkspaceSession("b1")?.syncActive);

for (const rel of [
  "components/globe/globe-resume-sidebar-list.tsx",
  "components/globe/globe-resume-invite-section.tsx",
  "components/context-workspace/workspace-share-settings-sheet.tsx",
  "hooks/use-shared-workspace-realtime-sync.ts",
  "lib/context-workspace/commit-workspace-invite-accept.ts",
  "docs/adr/047-rts-permission-model.md",
]) {
  assert.ok(readFileSync(join(process.cwd(), rel), "utf8").length > 100, rel);
}

const shell = readFileSync(
  join(process.cwd(), "components/globe/globe-container-space-sidebar.tsx"),
  "utf8",
);
assert.ok(shell.includes("GlobeResumeSidebarList"));
assert.ok(shell.includes("GlobeResumeInviteSection"));

const host = readFileSync(
  join(process.cwd(), "components/workspace-sdk/workspace-sdk-host.tsx"),
  "utf8",
);
assert.ok(host.includes("WorkspaceShareSettingsSheet"));

console.log("ok — resume/rts modules restored");
