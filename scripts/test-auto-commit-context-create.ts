#!/usr/bin/env npx tsx
/**
 * Clear trip Intent auto-commits Context create (no 생성 chip).
 */

import assert from "node:assert/strict";
import { buildPendingContextCreateDraft } from "../lib/globe-ingress/build-pending-context-create-draft";
import { shouldAutoCommitContextCreate } from "../lib/globe-ingress/should-auto-commit-context-create";
import { compileGlobeIngress } from "../lib/globe-ingress/compile-globe-ingress";

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
  },
});

function draftFor(utterance: string) {
  const compiled = compileGlobeIngress({ text: utterance });
  return buildPendingContextCreateDraft({
    graphId: "g-test",
    utterance,
    compiled,
  });
}

assert.equal(
  shouldAutoCommitContextCreate(draftFor("오사카 4박5일")),
  true,
  "destination + nights/days auto-commits",
);
assert.equal(
  shouldAutoCommitContextCreate(draftFor("도쿄 여행 3일")),
  true,
  "destination + days auto-commits",
);
assert.equal(
  shouldAutoCommitContextCreate(draftFor("여행 계획 좀")),
  false,
  "vague trip still needs chip",
);

console.log("test-auto-commit-context-create: ok");
