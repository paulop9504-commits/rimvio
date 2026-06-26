import assert from "node:assert/strict";
import { buildPhotoIngestUndoPayload } from "../lib/globe/globe-photo-ingest-undo";

const payload = buildPhotoIngestUndoPayload([
  {
    result: {
      event: {
        id: "evt-1",
        title: "제주",
        category: "life",
        source: "globe",
        lifecycle: "active",
        datetime: null,
        place: "제주",
        confidence: 1,
        metadata: {},
      },
      fragment: { id: "cap-1", kind: "photo", capturedAtIso: new Date().toISOString() },
      createdNewEvent: true,
    },
    attachedToHintedEvent: false,
    separated: false,
    toastLine: "",
    suggestedPlaceName: null,
    exifAutoPinned: false,
    pinCreated: true,
  },
]);

assert.ok(payload);
assert.equal(payload!.entries.length, 1);
assert.equal(payload!.entries[0]!.captureId, "cap-1");

console.log("test-globe-photo-ingest-undo: ok");
