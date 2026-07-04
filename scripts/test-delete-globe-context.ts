import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { readFeedCaptureFragments } from "../lib/feed/feed-capture-metadata";
import { deleteGlobeContexts as bulkDeleteGlobeContexts } from "../lib/globe/delete-globe-context";
import {
  readMirrorAudit,
  readMirrorProvenance,
  upsertMirrorProvenanceMetadata,
} from "../lib/globe/mirror-provenance";
import {
  findPersonalGlobePinByEventId,
  resetPersonalGlobePinsForTests,
} from "../lib/globe/personal-globe-pin-store";
import { projectContextMediaReel } from "../lib/globe/project-context-media-reel";
import { findEventCandidate, resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  listMediaSpacetimeContexts,
  resetMediaContextStoreForTests,
} from "../lib/location-ping/media-context-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

async function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();
  resetMediaContextStoreForTests();

  const created = createManualGlobeContext({
    title: "테스트 맥락",
    place: "제주",
    startIso: "2026-08-01T10:00",
    nights: 1,
    resolvedPlace: {
      label: "제주",
      placeName: "제주",
      lat: 33.4996,
      lng: 126.5312,
      confirmed: true,
    },
  });

  assert.ok(findPersonalGlobePinByEventId(created.event.id));

  commitEventUpsert({
    id: created.event.id,
    description: created.event.description,
    title: created.event.title,
    category: created.event.category,
    source: created.event.source,
    lifecycle: created.event.lifecycle,
    datetime: created.event.datetime,
    place: created.event.place,
    containerId: created.event.containerId,
    confidence: created.event.confidence,
    metadata: {
      ...created.event.metadata,
      feedCaptures: [
        {
          id: "cap-photo",
          kind: "photo",
          capturedAtIso: "2026-08-01T10:10:00+09:00",
          mediaContextId: "mc-linked",
          placeLabel: "제주",
          label: "바다",
        },
        {
          id: "cap-memo",
          kind: "memo",
          capturedAtIso: "2026-08-01T10:15:00+09:00",
          label: "메모",
        },
      ],
      feedCaptureStats: {
        photos: 1,
        videos: 0,
        links: 0,
        memos: 1,
      },
      feedCapturePendingVerify: true,
      feedCaptureVerifiedAt: "2026-08-01T10:20:00+09:00",
    },
  });

  resetMediaContextStoreForTests([
    {
      id: "mc-linked",
      mediaKind: "photo",
      capturedAtIso: "2026-08-01T10:10:00+09:00",
      originRef: created.event.id,
      lat: 33.4996,
      lng: 126.5312,
      placeLabel: "제주",
    },
    {
      id: "mc-store-only",
      mediaKind: "photo",
      capturedAtIso: "2026-08-01T10:30:00+09:00",
      originRef: created.event.id,
      lat: 33.4996,
      lng: 126.5312,
      placeLabel: "제주",
    },
  ]);

  const beforeDelete = findEventCandidate(created.event.id)!;
  assert.equal(readFeedCaptureFragments(beforeDelete).length, 2);
  assert.equal(projectContextMediaReel({ event: beforeDelete, volume: null }).length, 2);

  const { deleted, results } = await bulkDeleteGlobeContexts([created.event.id]);
  const result = results[0]!;
  assert.equal(deleted, 1);
  assert.equal(result.action, "delete_upstream");
  assert.equal(result.hidden, true);
  assert.equal(result.removedPin, true);
  assert.equal(findPersonalGlobePinByEventId(created.event.id), null);
  const deletedEvent = findEventCandidate(created.event.id)!;
  assert.equal(deletedEvent.metadata?.globeContextRemoved, true);
  assert.equal(readFeedCaptureFragments(deletedEvent).length, 0);
  assert.equal(deletedEvent.metadata?.feedCaptureStats, undefined);
  assert.equal(deletedEvent.metadata?.feedCapturePendingVerify, undefined);
  assert.equal(deletedEvent.metadata?.feedCaptureVerifiedAt, undefined);
  assert.equal(projectContextMediaReel({ event: deletedEvent, volume: null }).length, 0);
  const preservedMedia = await listMediaSpacetimeContexts();
  assert.equal(preservedMedia.length, 2);
  assert.equal(preservedMedia[0]?.originRef ?? null, null);
  assert.equal(preservedMedia[1]?.originRef ?? null, null);

  const mirroredMetadata = upsertMirrorProvenanceMetadata({
    metadata: {
      feedCaptures: [
        {
          id: "cap-mirror-photo",
          kind: "photo",
          capturedAtIso: "2026-08-02T09:05:00+09:00",
          mediaContextId: "mc-mirror",
          placeLabel: "부산 광안리",
          label: "광안리",
        },
      ],
      feedCaptureStats: {
        photos: 1,
        videos: 0,
        links: 0,
        memos: 0,
      },
    },
    patch: {
      resourceKind: "globe_context",
      projectionMode: "shared_mirrored",
      visibility: "private",
      viewerScope: "bridge_participants",
      bridge: {
        bridgeId: "bridge-detach-local",
      },
      origin: {
        sourceKind: "bridge_participant",
        originalAuthorUserId: "user-host",
        originalAuthorDisplayName: "민수",
        authoredAtIso: "2026-08-02T09:00:00+09:00",
        mirroredAtIso: "2026-08-02T09:01:00+09:00",
        originEventId: "evt-origin-detach",
      },
      integrity: {
        attribution: "bridge_host",
        placeBasis: "shared",
        timeBasis: "shared",
        originality: "mirror_copy",
      },
      sync: {
        state: "synced",
        lastSyncedAtIso: "2026-08-02T09:01:00+09:00",
      },
      permissions: {
        viewerRole: "participant",
        editMode: "local_edits",
        reshareMode: "owner_only",
        deleteMode: "local_only",
      },
    },
    nowIso: "2026-08-02T09:01:00+09:00",
  });
  const mirrored = commitEventUpsert({
    id: "evt-detach-local",
    title: "부산 광안리 함께",
    category: "social",
    source: "message",
    lifecycle: "confirmed",
    datetime: "2026-08-02T09:00:00+09:00",
    place: "부산 광안리",
    confidence: 0.92,
    metadata: mirroredMetadata,
  });
  resetMediaContextStoreForTests([
    {
      id: "mc-mirror",
      mediaKind: "photo",
      capturedAtIso: "2026-08-02T09:05:00+09:00",
      originRef: mirrored.id,
      lat: 35.1532,
      lng: 129.1187,
      placeLabel: "부산 광안리",
    },
  ]);

  const detachResult = await bulkDeleteGlobeContexts([mirrored.id]);
  assert.equal(detachResult.deleted, 1);
  assert.equal(detachResult.results[0]?.action, "detach_local");
  const detachedEvent = findEventCandidate(mirrored.id)!;
  assert.equal(readMirrorProvenance(detachedEvent.metadata)?.sync.state, "detached");
  assert.equal(readMirrorAudit(detachedEvent.metadata).at(-1)?.action, "detach_local");
  assert.equal(readFeedCaptureFragments(detachedEvent).length, 1);
  const detachedMedia = await listMediaSpacetimeContexts();
  assert.equal(detachedMedia[0]?.originRef ?? null, mirrored.id);

  console.log("test-delete-globe-context: ok");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
