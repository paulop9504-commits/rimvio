import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { GLOBE_CONTEXT_NOTE_KEY } from "../lib/globe/pin-context-note";
import { mergePhaseBRetrieval, PHASE_B_SEMANTIC_MIN_SCORE } from "../lib/personal-context-ask/resolve-phase-b-retrieval";
import { resolvePersonalContextAsk } from "../lib/personal-context-ask/resolve-personal-context-ask";
import { buildRecallEventSnapshot } from "../lib/recall/recall-event-snapshot";
import {
  gateCapabilityByExecutionTier,
  resolveExecutionTier,
} from "../lib/execution-tier/execution-tier-registry";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-phase-b",
    title: "제주 여행",
    category: "travel",
    source: "message",
    lifecycle: "completed",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    place: "제주시",
    metadata: {
      [GLOBE_CONTEXT_NOTE_KEY]: "바다 드라이브",
    },
    ...overrides,
  };
}

const now = new Date("2026-06-10T14:00:00.000Z");
const events = [
  baseEvent({ id: "ev-jeju" }),
  baseEvent({
    id: "ev-seoul",
    title: "서울 미팅",
    place: "강남",
    metadata: {},
  }),
];

{
  assert.equal(resolveExecutionTier("NAVIGATE"), 2);
  assert.equal(resolveExecutionTier("MESSAGE"), 3);
  assert.equal(resolveExecutionTier("CALENDAR"), 0);

  const blocked = gateCapabilityByExecutionTier({
    capabilityId: "MESSAGE",
    metadata: {},
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "commit_approval_required");

  const allowed = gateCapabilityByExecutionTier({
    capabilityId: "MESSAGE",
    metadata: { commitApproved: "true" },
  });
  assert.equal(allowed.allowed, true);
}

{
  const snapshots = events.map((event) => buildRecallEventSnapshot(event, now));
  const hits = mergePhaseBRetrieval({
    lexicalHits: [],
    events,
    query: "바다 드라이브 제주",
    snapshots,
    toHit: (snapshot, reasonKo, source) => ({
      eventId: snapshot.eventId,
      title: snapshot.title,
      headline: snapshot.headline,
      place: snapshot.place,
      atIso: snapshot.atIso,
      people: snapshot.people,
      reasonKo,
      photoCount: 0,
      dwellDays: null,
      photoPreviews: [],
      contextKind: null,
      spotLabels: [],
      periodEndIso: null,
      retrievalSource: source,
    }),
  });
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((hit) => hit.retrievalSource === "semantic"));
}

{
  const vague = resolvePersonalContextAsk({
    query: "바다 드라이브",
    events,
    scope: "personal",
    now,
  });
  assert.equal(vague.kind, "bridges");
  assert.ok(vague.hits.length >= 1);
}

{
  assert.ok(PHASE_B_SEMANTIC_MIN_SCORE >= 0.22);
}

console.log("test-jarvis-phase-b: ok");
