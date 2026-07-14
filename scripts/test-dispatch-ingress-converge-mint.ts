#!/usr/bin/env npx tsx
/**
 * globe_ingress hub-null — Find before mint:
 * ask_chips skips mint · auto_attach reuses · create_new / forceNew mint.
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

async function caseCreateNewMints(): Promise<void> {
  memory.clear();
  resetEventCandidatesForTests([]);
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
  assert.equal(result.planKind, "globe_ingress");
  assert.equal(handlers.track.chips, null, "create_new must not offer chips");
  assert.ok(handlers.track.compiled, "create_new must mint + compile");
  assert.ok(handlers.track.attached, "create_new must attach new event");
  assert.equal(
    handlers.track.compiled!.compiled.context.slots.find((s) => s.key === "destination")
      ?.resolution,
    "unresolved",
  );
  console.log("✓ create_new mints (hub-null empty store)");
}

async function caseAutoAttachSkipsFreshMint(): Promise<void> {
  memory.clear();
  const existing = japanTrip("evt-jp-1", "민수", 3);
  resetEventCandidatesForTests([existing]);
  const converge = resolveIngressContextConverge({
    utterance: "일본 여행 가려고",
    events: listLifeEventCandidates(),
  });
  assert.equal(converge.decision, "auto_attach");
  assert.equal(converge.attachEventId, "evt-jp-1");

  const beforeCount = listLifeEventCandidates().length;
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
  assert.equal(handlers.track.chips, null, "auto_attach must not offer chips");
  assert.ok(handlers.track.compiled, "auto_attach still compiles onto existing");
  assert.equal(handlers.track.attached, "evt-jp-1");
  assert.equal(handlers.track.compiled!.eventId, "evt-jp-1");
  assert.equal(
    handlers.track.compiled!.compiled.context.contextId,
    "evt-jp-1",
    "compile must reuse existingContextId",
  );
  assert.equal(
    listLifeEventCandidates().length,
    beforeCount,
    "auto_attach must not mint a second context row",
  );
  console.log("✓ auto_attach reuses existingContextId (no fresh mint)");
}

async function caseAskChipsSkipsMint(): Promise<void> {
  memory.clear();
  resetEventCandidatesForTests([
    japanTrip("evt-jp-a", "민수", 3),
    japanTrip("evt-jp-b", "지연", 4),
  ]);
  const converge = resolveIngressContextConverge({
    utterance: "일본 여행 가려고",
    events: listLifeEventCandidates(),
  });
  assert.equal(
    converge.decision,
    "ask_chips",
    `expected ask_chips for ambiguous peers, got ${converge.decision}`,
  );

  const beforeIds = new Set(listLifeEventCandidates().map((e) => e.id));
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
  assert.equal(result.planKind, "globe_ingress");
  assert.ok(handlers.track.chips, "ask_chips must call onIngressConvergeChips");
  assert.equal(handlers.track.chips!.decision, "ask_chips");
  assert.equal(handlers.track.compiled, null, "ask_chips must skip mint/compile");
  assert.equal(handlers.track.attached, null, "ask_chips must not attach");
  const afterIds = new Set(listLifeEventCandidates().map((e) => e.id));
  assert.deepEqual([...afterIds].sort(), [...beforeIds].sort());
  console.log("✓ ask_chips skips mint");
}

async function caseForceNewMintsDespiteHit(): Promise<void> {
  memory.clear();
  resetEventCandidatesForTests([japanTrip("evt-jp-1", "민수", 3)]);
  const handlers = trackHandlers();
  const result = await dispatchContextRun(
    {
      kind: "text",
      text: "일본 여행 가려고",
      surface: "composer",
      layerMode: "personal",
      contextEventId: null,
      forceNewContext: true,
    },
    handlers,
  );
  assert.equal(result.status, "done");
  assert.equal(handlers.track.chips, null, "forceNew must skip Find chips");
  assert.ok(handlers.track.compiled, "forceNew must mint");
  assert.ok(handlers.track.attached);
  assert.notEqual(
    handlers.track.compiled!.eventId,
    "evt-jp-1",
    "forceNew must not attach the Find hit",
  );
  assert.notEqual(
    handlers.track.compiled!.compiled.context.contextId,
    "evt-jp-1",
  );
  console.log("✓ forceNew mints despite Find hit");
}

async function main(): Promise<void> {
  await caseCreateNewMints();
  await caseAutoAttachSkipsFreshMint();
  await caseAskChipsSkipsMint();
  await caseForceNewMintsDespiteHit();
  console.log("\nAll dispatch ingress converge mint/skip tests passed.");
}

void main();
