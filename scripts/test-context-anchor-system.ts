#!/usr/bin/env npx tsx
/**
 * Context Anchor System — mint stays draft until 「생성」; Anchor move confirms.
 */
import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { dispatchContextRun } from "../lib/context-run/dispatch-context-run";
import type { ContextRunEffectHandlers } from "../lib/context-run/ingress-types";
import {
  readPendingContextCreate,
  resetPendingContextCreateForTests,
} from "../lib/globe-ingress/pending-context-create-store";
import { resetPendingContextAnchorMoveForTests } from "../lib/globe-ingress/pending-context-anchor-move-store";
import { parseContextAnchorMoveTarget } from "../lib/globe-ingress/detect-context-anchor-move";
import { listLifeEventCandidates } from "../lib/life-read-model";
import { ensureTripContextEvent } from "../lib/experience-run/ensure-trip-context-event";
import { readActiveRunState } from "../lib/context-run/run-state-store";
import { resolveActiveComposerGraphId } from "../lib/context-run/resolve-active-composer-graph-id";

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

function trackHandlers(): ContextRunEffectHandlers & {
  track: { compiled: string | null; attached: string | null };
} {
  const track = { compiled: null as string | null, attached: null as string | null };
  return {
    track,
    openPortal: async () => {},
    openFieldDiscovery: () => {},
    tryQuickListMarket: async () => false,
    navigateUrl: () => {},
    onGlobeIngressCompiled: (input) => {
      track.compiled = input.eventId;
    },
    onAttached: (eventId) => {
      track.attached = eventId;
    },
  };
}

installStorage();

assert.equal(
  parseContextAnchorMoveTarget("홍차오 근처로 맥락 위치 옮겨"),
  "홍차오",
);

async function caseMintStaysDraft(): Promise<void> {
  memory.clear();
  resetEventCandidatesForTests([]);
  resetPendingContextCreateForTests();
  resetPendingContextAnchorMoveForTests();
  const before = listLifeEventCandidates().length;
  const handlers = trackHandlers();
  const result = await dispatchContextRun(
    {
      kind: "text",
      text: "다음주 목요일 출발 상하이 2박3일 여행갈거야",
      surface: "composer",
      layerMode: "personal",
      contextEventId: null,
    },
    handlers,
  );
  assert.equal(result.status, "done");
  assert.equal(result.planKind, "globe_ingress");
  assert.equal(handlers.track.compiled, null, "must not compile-commit yet");
  assert.equal(handlers.track.attached, null, "must not attach yet");
  assert.equal(
    listLifeEventCandidates().length,
    before,
    "mint must not write EventCandidate before 「생성」",
  );
  const graphId =
    readActiveRunState()?.graphId ??
    resolveActiveComposerGraphId("다음주 목요일 출발 상하이 2박3일 여행갈거야");
  const pending = readPendingContextCreate(graphId);
  assert.ok(pending, "pending draft must exist");
  assert.equal(pending!.reality, "draft");
  assert.match(pending!.titleKo, /상하이/);
  console.log("✓ mint stays draft until create");
}

async function caseCreateCommits(): Promise<void> {
  memory.clear();
  resetEventCandidatesForTests([]);
  resetPendingContextCreateForTests();
  const handlers1 = trackHandlers();
  await dispatchContextRun(
    {
      kind: "text",
      text: "상하이 여행 가려고",
      surface: "composer",
      layerMode: "personal",
      contextEventId: null,
    },
    handlers1,
  );
  const graphId =
    readActiveRunState()?.graphId ??
    resolveActiveComposerGraphId("상하이 여행 가려고");
  assert.ok(readPendingContextCreate(graphId));

  const handlers2 = trackHandlers();
  const result = await dispatchContextRun(
    {
      kind: "text",
      text: "생성",
      surface: "composer",
      layerMode: "personal",
      contextEventId: null,
    },
    handlers2,
  );
  assert.equal(result.planKind, "globe_ingress");
  assert.ok(handlers2.track.compiled, "생성 must commit event");
  assert.ok(handlers2.track.attached);
  assert.equal(readPendingContextCreate(graphId), null);
  assert.ok(listLifeEventCandidates().length >= 1);
  console.log("✓ 「생성」commits Context Globe");
}

async function caseAnchorMoveConfirm(): Promise<void> {
  memory.clear();
  resetEventCandidatesForTests([]);
  resetPendingContextCreateForTests();
  resetPendingContextAnchorMoveForTests();

  const event = ensureTripContextEvent({
    message: "상하이 여행",
    profile: "leisure_travel",
  });
  const handlers1 = trackHandlers();
  const r1 = await dispatchContextRun(
    {
      kind: "text",
      text: "오사카 근처로 맥락 위치 옮겨",
      surface: "composer",
      layerMode: "personal",
      contextEventId: event.id,
    },
    handlers1,
  );
  assert.equal(r1.status, "done");
  const graphId =
    readActiveRunState()?.graphId ??
    resolveActiveComposerGraphId("오사카 근처로 맥락 위치 옮겨");
  const { readPendingContextAnchorMove } = await import(
    "../lib/globe-ingress/pending-context-anchor-move-store"
  );
  assert.ok(readPendingContextAnchorMove(graphId), "anchor move pending");

  const beforeLabel = (event.metadata?.globePlaceLabel as string) || "";
  const handlers2 = trackHandlers();
  await dispatchContextRun(
    {
      kind: "text",
      text: "확인",
      surface: "composer",
      layerMode: "personal",
      contextEventId: event.id,
    },
    handlers2,
  );
  const updated = listLifeEventCandidates().find((e) => e.id === event.id) as
    | EventCandidate
    | undefined;
  assert.ok(updated);
  const afterLabel = String(updated!.metadata?.globePlaceLabel ?? "");
  assert.notEqual(afterLabel, beforeLabel);
  assert.match(afterLabel, /오사카/);
  console.log("✓ Anchor move confirm relocates");
}

async function main(): Promise<void> {
  await caseMintStaysDraft();
  await caseCreateCommits();
  await caseAnchorMoveConfirm();
  console.log("✓ context-anchor-system");
}

void main();
