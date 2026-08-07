#!/usr/bin/env npx tsx
/**
 * 「후쿠오카 맛집 찾아줘」must prepare eatery Workspace — never lodging hotels.
 */

import assert from "node:assert/strict";
import { isEateryOnlyDiscoveryUtterance } from "../lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { prepareWorkspaceResources } from "../lib/workspace-kind/prepare-workspace-resources";
import { buildWorkspacePrepCard } from "../lib/workspace-kind/build-workspace-prep-card";
import { compileWorkspaceAgentPlan } from "../lib/context-run/compile-workspace-agent-plan";

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

const utterance = "후쿠오카 맛집 찾아줘";

assert.equal(isEateryOnlyDiscoveryUtterance(utterance), true);
assert.equal(isEateryOnlyDiscoveryUtterance("후쿠오카 호텔 찾아줘"), false);
assert.equal(
  isEateryOnlyDiscoveryUtterance("후쿠오카 호텔이랑 맛집 찾아줘"),
  false,
);

const prepared = prepareWorkspaceResources({
  utterance,
  contextEventId: "ctx-fukuoka-eatery",
  titleOverrideKo: "후쿠오카",
});
assert.ok(prepared?.workspace, "eatery workspace prepared");
assert.equal(prepared!.workspace!.domain, "eatery");
assert.equal(
  prepared!.workspace!.nodes.filter((n) => n.kind === "lodging").length,
  0,
  "no lodging nodes on eatery-only prep",
);
assert.equal(prepared!.card.focusSlotId, "eatery");

const card = buildWorkspacePrepCard({ utterance });
assert.ok(card);
assert.equal(card!.focusSlotId, "eatery");

const plan = compileWorkspaceAgentPlan({
  utterance,
  contextEventId: "ctx-fukuoka-eatery",
});
const hotelSteps = plan.steps.filter(
  (s) =>
    s.kind === "workspace_prompt" &&
    (s.expect?.target === "lodging" || /호텔/.test(s.labelKo ?? "")),
);
const eaterySteps = plan.steps.filter(
  (s) =>
    s.kind === "workspace_prompt" &&
    (s.expect?.target === "eatery" || /맛집/.test(s.labelKo ?? "")),
);
assert.equal(hotelSteps.length, 0, "agent plan must not scout lodging");
assert.ok(eaterySteps.length >= 1, "agent plan must scout eatery");

console.log("test-fukuoka-eatery-not-lodging: ok");
