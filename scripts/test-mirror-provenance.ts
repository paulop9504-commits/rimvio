import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { ExperienceBridgeSnapshot } from "../lib/experience-bridge/experience-bridge-types";
import {
  projectMirrorProvenanceSummary,
  readMirrorAudit,
  readMirrorProvenance,
} from "../lib/globe/mirror-provenance";
import { stampBridgeEventMetadata } from "../lib/experience-bridge/stamp-bridge-event-metadata";

const baseEvent: EventCandidate = {
  id: "evt-mirror-provenance-host",
  title: "민수와 부산",
  category: "social",
  source: "message",
  lifecycle: "confirmed",
  datetime: "2026-07-04T10:00:00.000Z",
  place: "부산 광안리",
  confidence: 0.94,
  metadata: {
    globeContextVisibility: "private",
  },
  lifecycleUpdatedAt: "2026-07-04T10:05:00.000Z",
  createdAt: "2026-07-04T10:00:00.000Z",
  updatedAt: "2026-07-04T10:00:00.000Z",
};

const bridge: ExperienceBridgeSnapshot = {
  eventId: "bridge-mirror-provenance-1",
  hostUserId: "user-host-1",
  peerThreadId: "peer:bridge-mirror-provenance",
  title: "민수와 부산",
  placeLabel: "부산 광안리",
  lat: 35.1532,
  lng: 129.1187,
  eventSnapshot: baseEvent,
  createdAtIso: "2026-07-04T10:10:00.000Z",
};

const hostStamped = stampBridgeEventMetadata({
  event: baseEvent,
  bridge,
  role: "host",
  hostDisplayName: "민수",
});

const hostProvenance = readMirrorProvenance(hostStamped.metadata);
assert.ok(hostProvenance);
assert.equal(hostProvenance?.projectionMode, "shared");
assert.equal(hostProvenance?.origin.originalAuthorUserId, "user-host-1");
assert.equal(hostProvenance?.origin.originalAuthorDisplayName, "민수");
assert.equal(hostProvenance?.permissions.viewerRole, "host");
assert.equal(readMirrorAudit(hostStamped.metadata).length, 1);

const participantStamped = stampBridgeEventMetadata({
  event: {
    ...baseEvent,
    id: "evt-mirror-provenance-participant",
    metadata: hostStamped.metadata,
  },
  bridge: {
    ...bridge,
    eventSnapshot: hostStamped,
  },
  role: "participant",
  participantUserId: "user-participant-1",
});

const participantProvenance = readMirrorProvenance(participantStamped.metadata);
assert.ok(participantProvenance);
assert.equal(participantProvenance?.projectionMode, "shared_mirrored");
assert.equal(participantProvenance?.origin.originalAuthorDisplayName, "민수");
assert.equal(participantProvenance?.permissions.viewerRole, "participant");
assert.ok(participantProvenance?.origin.mirroredAtIso);

const participantSummary = projectMirrorProvenanceSummary({
  event: participantStamped,
  viewerUserId: "user-participant-1",
});
assert.ok(participantSummary);
assert.equal(participantSummary?.showOriginalAuthor, true);
assert.equal(participantSummary?.syncState, "synced");
assert.equal(participantSummary?.hasLocalOverrides, false);
assert.deepEqual(participantSummary?.overrideFields, []);
assert.equal(participantSummary?.deleteIntent, "detach_local");
assert.equal(participantSummary?.bridgeId, "bridge-mirror-provenance-1");

console.log("test-mirror-provenance: ok");
