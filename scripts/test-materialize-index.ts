import assert from "node:assert/strict";
import { encodeGeohash } from "../lib/materialize/encode-geohash";
import { indexMediaContext } from "../lib/materialize/index-from-media-context";
import { enqueueVaultSync } from "../lib/materialize/enqueue-vault-sync";
import {
  readCaptureIndexMemory,
  readSyncQueueMemory,
  resetMaterializeStoreForTests,
} from "../lib/materialize/materialize-db";
import { captureVaultKey, mediaBlobVaultKey } from "../lib/vault/vault-object-keys";
import type { MediaSpacetimeContext } from "../lib/location-ping/types";

function sampleContext(overrides: Partial<MediaSpacetimeContext> = {}): MediaSpacetimeContext {
  return {
    id: "mc-test-1",
    capturedAtIso: "2026-06-19T10:00:00.000Z",
    lat: 37.5665,
    lng: 126.978,
    accuracyM: 12,
    placeLabel: "서울",
    resolveSource: "exif_gps",
    matchedPingId: null,
    mediaKind: "photo",
    origin: "feed_capture",
    originRef: "ec-event-1",
    fileName: "IMG_001.jpg",
    attachedAtIso: "2026-06-19T10:01:00.000Z",
    ...overrides,
  };
}

async function main() {
  resetMaterializeStoreForTests();

  const geohash = encodeGeohash(37.5665, 126.978, 7);
  assert.ok(geohash.length === 7);
  assert.ok(typeof geohash === "string");

  const indexed = await indexMediaContext({
    context: sampleContext(),
    fileHash: "abc123hash",
  });
  assert.equal(indexed.outcome, "indexed");
  assert.equal(readCaptureIndexMemory().length, 1);
  assert.equal(readCaptureIndexMemory()[0]?.geohash, geohash);
  assert.equal(readCaptureIndexMemory()[0]?.syncState, "local");

  const deduped = await indexMediaContext({
    context: sampleContext({ id: "mc-test-2" }),
    fileHash: "abc123hash",
  });
  assert.equal(deduped.outcome, "deduped");

  await enqueueVaultSync({ kind: "capture", mediaContextId: "mc-test-1" });
  await enqueueVaultSync({ kind: "media_blob", mediaContextId: "mc-test-1" });
  assert.equal(readSyncQueueMemory().length, 2);
  assert.equal(readCaptureIndexMemory()[0]?.syncState, "queued");

  const eventId = "ec-event-1";
  assert.equal(
    captureVaultKey(eventId, "mc-test-1"),
    readSyncQueueMemory()[0]?.objectKey,
  );
  assert.equal(
    mediaBlobVaultKey("mc-test-1"),
    readSyncQueueMemory()[1]?.objectKey,
  );

  console.log("test-materialize-index: ok");
}

void main();
