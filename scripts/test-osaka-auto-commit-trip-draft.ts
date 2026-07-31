#!/usr/bin/env npx tsx
/**
 * Auto-commit Continuum stamps Osaka Reality Draft (not empty lodging shell).
 */

import assert from "node:assert/strict";
import { prepareWorkspaceResources } from "../lib/workspace-kind/prepare-workspace-resources";
import { shouldPrepareTripWorkspaceDraft } from "../lib/context-workspace/prepare-trip-workspace-draft";
import { isTripPrepUtterance } from "../lib/action-planner/build-trip-prep-plan";

const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: (k: string) => {
    memory.delete(k);
  },
  clear: () => memory.clear(),
};
Object.assign(globalThis, {
  localStorage: storage,
  sessionStorage: storage,
  window: {
    localStorage: storage,
    sessionStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (fn: () => void, _ms?: number) => {
      fn();
      return 0;
    },
    clearTimeout: () => {},
  },
});

const utterance = "오사카 4박5일";
assert.equal(shouldPrepareTripWorkspaceDraft(utterance), true);
assert.equal(isTripPrepUtterance(utterance), true);

const prepared = prepareWorkspaceResources({
  utterance,
  contextEventId: "ctx-osaka-auto",
  titleOverrideKo: "오사카",
});

assert.ok(prepared?.workspace, "workspace prepared");
assert.ok(
  (prepared!.workspace!.nodes.length ?? 0) >= 3,
  `expected draft pins, got ${prepared!.workspace!.nodes.length}`,
);
assert.ok(
  prepared!.workspace!.nodes.some((n) => n.kind === "lodging"),
  "lodging in draft",
);
assert.ok(
  prepared!.workspace!.nodes.some((n) => /도톤보리|유니버설|난바|쿠로몬/u.test(n.title)),
  "itinerary anchors present",
);

console.log("test-osaka-auto-commit-trip-draft: ok");
