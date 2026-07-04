#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventLifecycle, commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  queryEntityNeighbors,
  readEntityGraphSnapshot,
  resetEntityGraphStoreForTests,
} from "../lib/ontology";
import { filterEdgeEvidenceForRecall } from "../lib/ontology/filter-active-edge-evidence";

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();

const committed = commitEventUpsert({
  id: "ev-jeju-1",
  title: "민수랑 제주 Day2",
  category: "travel",
  source: "message",
  lifecycle: "completed",
  place: "제주",
  datetime: "2024-08-10T18:00:00",
  confidence: 0.9,
  metadata: {
    peerDisplayName: "민수",
    feedCaptures: [
      {
        id: "cap-1",
        kind: "photo",
        capturedAtIso: "2024-08-10T18:00:00",
        placeLabel: "제주",
        verified: true,
      },
    ],
  },
});

const snapshot = readEntityGraphSnapshot();
assert.ok(snapshot.edges.length > 0, "commit should materialize entity edges");

const personPlace = snapshot.edges.find(
  (edge) => edge.kind === "person_place" && edge.evidence.length > 0,
);
assert.ok(personPlace, "expected person_place edge with evidence");
assert.ok(
  personPlace!.evidence.some((row) => row.type === "event" && row.id === committed.id),
  "evidence must reference committing event",
);

const captureEdge = snapshot.edges.find((edge) => edge.kind === "capture_belongs");
assert.ok(captureEdge, "expected capture_belongs edge");
assert.ok(
  captureEdge!.evidence.some((row) => row.type === "capture" && row.id === "cap-1"),
  "capture evidence required",
);

const neighbors = queryEntityNeighbors({
  entityId: "person:민수",
  recallSafe: true,
});
assert.ok(neighbors.length > 0, "1-hop query should return neighbors");

commitEventLifecycle(committed.id, "archived");

const archivedFiltered = filterEdgeEvidenceForRecall(personPlace!);
assert.equal(
  archivedFiltered.length,
  0,
  "archived event evidence excluded at read time",
);

const recallNeighbors = queryEntityNeighbors({
  entityId: "person:민수",
  recallSafe: true,
});
assert.equal(
  recallNeighbors.length,
  0,
  "archived-only edges must not surface in recall-safe query",
);

assert.ok(
  readEntityGraphSnapshot().edges.some((edge) => edge.id === personPlace!.id),
  "edge remains in store for audit after archive",
);

console.log("test-entity-graph-commit: ok");
