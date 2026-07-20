#!/usr/bin/env npx tsx
/**
 * Place → Reflect → CEO Sign → durable Reality Commit stamp.
 */

import assert from "node:assert/strict";
import {
  asQueueItem,
  clearPreparedRealityOperations,
  commitRealityQueueClient,
  enqueuePlacePrepToExecutionInbox,
  listPreparedRealityOperations,
  readCommittedOperationsFromEvent,
  reflectRealityOperation,
} from "../lib/reality-queue";
import { resetEventCandidatesForTests, upsertEventCandidate } from "../lib/events/event-store";

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

resetEventCandidatesForTests();
clearPreparedRealityOperations();

async function main() {
  const stamp = new Date().toISOString();
  const event = upsertEventCandidate({
    id: "evt-commit-place",
    title: "오늘 저녁",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: stamp,
    place: "유성",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const op = enqueuePlacePrepToExecutionInbox({
    contextEventId: event.id,
    contextLabelKo: event.title,
    placeId: "place-imseongbo",
    placeName: "임성보동태찌개",
    kind: "eatery",
    partySize: 2,
    reserveAtLabelKo: "19:00",
    budgetWon: 15_000,
  });

  assert.equal(listPreparedRealityOperations().length, 1);
  assert.equal(op.status, "pending");

  const blocked = await commitRealityQueueClient({
    items: [asQueueItem(op)],
    canCommit: false,
  });
  assert.equal(blocked.ok, false);

  reflectRealityOperation(asQueueItem(op));
  const readyItems = listPreparedRealityOperations().map(asQueueItem);
  assert.equal(readyItems[0]?.status, "ready");

  const committed = await commitRealityQueueClient({
    items: readyItems,
    canCommit: true,
  });
  assert.equal(committed.ok, true);
  if (committed.ok) {
    assert.equal(committed.tradeOnly, false);
    assert.ok(committed.preparedCommittedCount >= 1);
    assert.ok(committed.contextEventIds.includes(event.id));
  }

  assert.equal(listPreparedRealityOperations().length, 0);

  const { findLifeEventCandidate } = await import("../lib/life-read-model");
  const after = findLifeEventCandidate(event.id);
  assert.ok(after);
  const stamps = readCommittedOperationsFromEvent(after!);
  assert.ok(stamps.some((row) => row.labelKo === "임성보동태찌개"));

  clearPreparedRealityOperations();
  resetEventCandidatesForTests();
  console.log("test-place-execution-commit: ok");
}

void main();
