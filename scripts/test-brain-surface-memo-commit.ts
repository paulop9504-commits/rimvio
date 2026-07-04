#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests, listEventCandidates } from "../lib/events/event-store";
import { readGlobeContextCardCoords } from "../lib/globe/globe-context-card-coords";
import { commitBrainSurfaceMemoPin } from "../lib/globe/commit-brain-surface-memo-pin";

resetEventCandidatesForTests([
  {
    id: "ev-anchor-trip",
    title: "오사카 여행",
    category: "travel",
    source: "message",
    lifecycle: "active",
    place: "오사카",
    confidence: 0.92,
    metadata: {},
    lifecycleUpdatedAt: "2026-07-04T00:00:00.000Z",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
]);

async function main() {
  const beforeCount = listEventCandidates().length;
  const saved = await commitBrainSurfaceMemoPin({
    anchorEventId: "ev-anchor-trip",
    draft: {
      title: "도톤보리 메모",
      placeLabel: "오사카 도톤보리",
      note: "오사카 여행 · 밤에 걸으면 좋은 곳",
      lat: 34.6687,
      lng: 135.5019,
    },
  });

  const after = listEventCandidates();
  assert.equal(after.length, beforeCount + 1, "memo commit should create a new event");
  assert.equal(saved.place, "오사카 도톤보리");
  assert.equal(
    saved.metadata?.brainSurfaceMemo,
    true,
    "brain surface commit should be stamped on the saved event",
  );
  assert.equal(
    saved.metadata?.anchorEventId,
    "ev-anchor-trip",
    "saved memo pin should preserve its parent context",
  );
  assert.equal(
    saved.metadata?.globePlaceConfirmed,
    true,
    "memo pin should be immediately place-bound on commit",
  );
  const coords = readGlobeContextCardCoords(saved);
  assert.equal(coords.lat, 34.6687);
  assert.equal(coords.lng, 135.5019);
  assert.equal(coords.placeLabel, "오사카 도톤보리");

  console.log("test-brain-surface-memo-commit: ok");
}

void main();
