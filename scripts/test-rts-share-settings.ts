#!/usr/bin/env npx tsx
/**
 * RTS share roster + Sheets-style roles (ADR-047).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ensureContextShareRoster,
  setContextShareMemberRole,
  upsertContextShareMember,
  readContextShareRoster,
} from "@/lib/context-workspace/rts-share/context-share-roster-store";
import {
  canEditWorkspaceObject,
  canManageContextShare,
  canPayOrReserveObject,
  canProposeOnMap,
  ownershipMarkForNode,
} from "@/lib/context-workspace/rts-share/rts-permission-gates";
import { contextShareRoleLabelKo } from "@/lib/context-workspace/rts-share/types";

const CTX = "ctx_share_rts_test";
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
    peerThreadId: "thread_x",
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

const roster = readContextShareRoster(CTX);
assert.ok(roster);
assert.equal(
  roster.members.find((m) => m.userId === FRIEND)?.role,
  "suggest",
);
assert.equal(contextShareRoleLabelKo("suggest"), "제안");
assert.equal(canManageContextShare({ contextEventId: CTX, userId: OWNER }), true);
assert.equal(canManageContextShare({ contextEventId: CTX, userId: FRIEND }), false);
assert.equal(canProposeOnMap({ contextEventId: CTX, userId: FRIEND }), true);
assert.equal(
  canEditWorkspaceObject({
    contextEventId: CTX,
    userId: FRIEND,
    node: { ownerUserId: OWNER },
  }),
  false,
);
assert.equal(
  canEditWorkspaceObject({
    contextEventId: CTX,
    userId: OWNER,
    node: { ownerUserId: OWNER },
  }),
  true,
);
assert.equal(
  canPayOrReserveObject({
    contextEventId: CTX,
    userId: FRIEND,
    node: { ownerUserId: OWNER },
  }),
  false,
);
assert.equal(
  ownershipMarkForNode({ viewerUserId: OWNER, node: { ownerUserId: OWNER } }),
  "mine",
);
assert.equal(
  ownershipMarkForNode({ viewerUserId: OWNER, node: { ownerUserId: FRIEND } }),
  "companion",
);
assert.equal(
  ownershipMarkForNode({ viewerUserId: OWNER, node: { ownerUserId: null } }),
  "shared",
);

const sheet = readFileSync(
  join(process.cwd(), "components/context-workspace/workspace-share-settings-sheet.tsx"),
  "utf8",
);
assert.ok(sheet.includes("data-workspace-share-settings"));
assert.ok(sheet.includes("shareGlobeContextWithFriends"));

const host = readFileSync(
  join(process.cwd(), "components/workspace-sdk/workspace-sdk-host.tsx"),
  "utf8",
);
assert.ok(host.includes("WorkspaceShareSettingsSheet"));
assert.ok(host.includes("data-workspace-share-open"));

console.log("ok — rts share settings");
