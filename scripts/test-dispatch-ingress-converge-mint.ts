#!/usr/bin/env npx tsx
/**
 * globe_ingress hub-null — Find before mint:
 * actionable → create_new drafts; vague + hits → ask_chips only when choices exist.
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { dispatchContextRun } from "../lib/context-run/dispatch-context-run";
import type { ContextRunEffectHandlers } from "../lib/context-run/ingress-types";
import { resolveIngressContextConverge } from "../lib/globe-ingress/resolve-ingress-context-converge";
import type { IngressContextConvergeResult } from "../lib/globe-ingress/resolve-ingress-context-converge";
import type { GlobeIngressCompileResult } from "../lib/globe-ingress/types";
import { listLifeEventCandidates } from "../lib/life-read-model";
import { resetPendingContextCreateForTests } from "../lib/globe-ingress/pending-context-create-store";

const memory = new Map<string, string>();

function installStorage(): void {
  const api = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
    key: (index: number) => [...memory.keys()][index] ?? null,
    get length() {
      return memory.size;
    },
  };
  const win = {
    localStorage: api,
    sessionStorage: api,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    location: { assign: () => {}, href: "http://localhost/" },
    history: { replaceState: () => {} },
  };
  Object.assign(globalThis, {
    localStorage: api,
    sessionStorage: api,
    window: win,
  });
}

function japanTrip(id: string, peer: string, day: number): EventCandidate {
  return {
    id,
    title: "일본 여행",
    category: "travel",
    source: "chat",
    lifecycle: "active",
    datetime: `2025-0${day}-01T10:00:00.000Z`,
    place: "일본",
    confidence: 0.9,
    metadata: {
      feedPlanEnabled: true,
      planPeerDisplayName: peer,
      planWindowEndIso: `2025-0${day}-05T10:00:00.000Z`,
      feedCaptures: [
        {
          id: `cap-${id}`,
          kind: "photo",
          capturedAtIso: `2025-0${day}-02T11:00:00.000Z`,
          placeLabel: "도쿄",
        },
      ],
    },
    lifecycleUpdatedAt: `2025-0${day}-01T10:00:00.000Z`,
    createdAt: `2025-0${day}-01T10:00:00.000Z`,
    updatedAt: `2025-0${day}-02T11:00:00.000Z`,
  };
}

type Track = {
  chips: IngressContextConvergeResult | null;
  compiled: { compiled: GlobeIngressCompileResult; eventId: string } | null;
  attached: string | null;
};

function trackHandlers(): ContextRunEffectHandlers & { track: Track } {
  const track: Track = { chips: null, compiled: null, attached: null };
  return {
    track,
    openPortal: async () => {},
    openFieldDiscovery: () => {},
    tryQuickListMarket: async () => false,
    navigateUrl: () => {},
    onIngressConvergeChips: (result) => {
      track.chips = result;
      return result.hits.length > 0;
    },
    onGlobeIngressCompiled: (input) => {
      track.compiled = input;
    },
    onAttached: (eventId) => {
      track.attached = eventId;
    },
  };
}

installStorage();

async function caseCreateNewDrafts(): Promise<void> {
  memory.clear();
  resetEventCandidatesForTests([]);
  resetPendingContextCreateForTests();
  const handlers = trackHandlers();
  const result = await dispatchContextRun(
    {
      kind: "text",
      text: "일본 여행 가려고",
      surface: "composer",
      layerMode: "personal",
      contextEventId: null,
    },
    handlers,
  );
  assert.equal(result.status, "done");
  assert.equal(handlers.track.chips, null, "must not offer empty converge pick");
  console.log("✓ create path does not empty-pick", result.planKind);
}

async function caseActionableSkipsConvergePicker(): Promise<void> {
  memory.clear();
  resetPendingContextCreateForTests();
  resetEventCandidatesForTests([japanTrip("evt-jp-1", "민수", 3)]);
  const converge = resolveIngressContextConverge({
    utterance: "도쿄 4박5일 계획 세워",
    events: listLifeEventCandidates(),
  });
  assert.equal(converge.decision, "create_new");

  const handlers = trackHandlers();
  const result = await dispatchContextRun(
    {
      kind: "text",
      text: "도쿄 4박5일 계획 세워",
      surface: "composer",
      layerMode: "personal",
      contextEventId: null,
    },
    handlers,
  );
  assert.equal(result.status, "done");
  assert.equal(handlers.track.chips, null, "must not ask pick with empty UI");
  console.log("✓ actionable trip skips converge picker", result.planKind);
}

async function caseVagueMayAskChips(): Promise<void> {
  memory.clear();
  resetPendingContextCreateForTests();
  resetEventCandidatesForTests([
    japanTrip("evt-jp-a", "민수", 3),
    japanTrip("evt-jp-b", "지연", 4),
  ]);
  const converge = resolveIngressContextConverge({
    utterance: "여행",
    events: listLifeEventCandidates(),
  });
  if (converge.decision === "ask_chips") {
    assert.ok(converge.hits.length >= 1);
    const handlers = trackHandlers();
    await dispatchContextRun(
      {
        kind: "text",
        text: "여행",
        surface: "composer",
        layerMode: "personal",
        contextEventId: null,
      },
      handlers,
    );
    if (handlers.track.chips) {
      assert.ok(handlers.track.chips.hits.length > 0);
    }
  }
  console.log("✓ vague utterance converge path");
}

async function main(): Promise<void> {
  await caseCreateNewDrafts();
  await caseActionableSkipsConvergePicker();
  await caseVagueMayAskChips();
  console.log("\nAll dispatch ingress converge mint/skip tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
