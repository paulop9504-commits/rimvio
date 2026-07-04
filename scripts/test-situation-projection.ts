#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  composeSituationProjectionManifest,
  isGhostProjectionNode,
  isSolidProjectionNode,
  readProjectionManifestForAnchor,
  resetProjectionStoreForTests,
  writeProjectionManifest,
} from "../lib/situation-projection";
import { readEntityGraphSnapshot, resetEntityGraphStoreForTests } from "../lib/ontology";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();
resetProjectionStoreForTests();

const event = commitEventUpsert({
  id: "ev-mom-care",
  title: "어머니 진단 상담",
  category: "custom",
  source: "message",
  lifecycle: "completed",
  place: "○○병원",
  metadata: { peerDisplayName: "어머니" },
});

const manifest = composeSituationProjectionManifest({
  event,
  trigger: { source: "calendar", sourceRef: "cal-1", atIso: new Date().toISOString() },
});

assert.equal(manifest.situationType, "caregiving");
assert.equal(manifest.readOnly, true);

const solids = manifest.nodes.filter(isSolidProjectionNode);
const ghosts = manifest.nodes.filter(isGhostProjectionNode);
assert.ok(solids.length >= 2, "solid anchors from event + place/person");
assert.ok(ghosts.length > 0, "ghost axes for missing playbook slots");
assert.equal(solids[0]?.ontologyRole, "root");
assert.equal(solids[0]?.semanticTypeLabelKo, "주맥락");
assert.ok(
  ghosts.every((node) => node.virtual === true),
  "all ghost nodes must be virtual",
);
assert.ok(
  manifest.links.some((link) => link.virtual === false && Boolean(link.relationLabelKo)),
  "solid ontology links connect anchor to committed nodes",
);
assert.ok(
  manifest.links.some((link) => link.virtual === true && Boolean(link.relationLabelKo)),
  "ghost ontology links keep semantic relation labels",
);
assert.ok(Array.isArray(manifest.pills), "manifest includes hub pills");

writeProjectionManifest(manifest);
assert.ok(readProjectionManifestForAnchor(event.id));

assert.equal(
  readEntityGraphSnapshot().edges.filter((edge) =>
    edge.evidence.some((row) => row.type === "gathering"),
  ).length,
  0,
  "projection must not write entity graph edges",
);

console.log("test-situation-projection: ok");
