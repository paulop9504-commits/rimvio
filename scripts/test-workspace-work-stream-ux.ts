/**
 * Invariant: Workspace Agent work stream is one-scroll + collapse (no nested Agent/chat scrolls).
 * Run: npx tsx scripts/test-workspace-work-stream-ux.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

function src(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const dock = src("components/context-workspace/workspace-cursor-dock.tsx");
assert.match(dock, /data-workspace-work-stream/);
assert.match(dock, /data-agent-step-collapse/);
assert.doesNotMatch(
  dock,
  /max-h-\[min\(12vh,96px\)\].*overflow-y-auto/s,
  "dock must not nest a tiny chat scroller separate from Agent panel",
);
assert.match(dock, /workspaceWorkStreamCollapse/);
assert.match(dock, /Single scroll/);

const activity = src(
  "components/context-workspace/workspace-agent-activity-panel.tsx",
);
assert.doesNotMatch(
  activity,
  /max-h-\[min\(36dvh,280px\)\].*overflow-y-auto/s,
  "activity panel must not nest its own overflow scroller",
);
assert.match(activity, /finished steps collapse/);

const card = src("components/mobile-workspace/AgentChatCard.tsx");
assert.doesNotMatch(
  card,
  /max-h-\[min\(24dvh,180px\)\].*overflow-y-auto/s,
  "AgentChatCard activity list must use parent card scroll only",
);
assert.match(card, /Steps live in the parent card scroller/);

console.log("OK — workspace-work-stream-ux");
