#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  inferGlobeContextIngestMediaKind,
  isGlobeContextIngestMediaFile,
  partitionGlobeContextIngestMediaFiles,
} from "@/lib/feed/ingest-globe-context-media";
import { validateIngestMediaFiles } from "@/lib/globe/validate-ingest-media-files";

function file(
  name: string,
  type: string,
  size = 1024,
): File {
  return new File([new Uint8Array(size)], name, { type });
}

assert.equal(isGlobeContextIngestMediaFile(file("photo.jpg", "image/jpeg")), true);
assert.equal(isGlobeContextIngestMediaFile(file("clip.mov", "", 2048)), true);
assert.equal(
  isGlobeContextIngestMediaFile(file("1000023456", "application/octet-stream")),
  true,
  "numeric mobile album names without MIME should ingest",
);
assert.equal(
  isGlobeContextIngestMediaFile(file("scan.pdf", "application/octet-stream")),
  false,
);
assert.equal(inferGlobeContextIngestMediaKind(file("clip.mov", "")), "video");
assert.equal(
  inferGlobeContextIngestMediaKind(file("1000023456", "application/octet-stream")),
  "photo",
);

const mixed = partitionGlobeContextIngestMediaFiles([
  file("a.jpg", "image/jpeg"),
  file("notes.pdf", "application/pdf"),
  file("b", ""),
]);
assert.equal(mixed.accepted.length, 2);
assert.equal(mixed.rejected.length, 1);

const validated = validateIngestMediaFiles([
  file("a.jpg", "image/jpeg"),
  file("notes.pdf", "application/pdf"),
  file("b", ""),
]);
assert.equal(validated.ok, true);
if (validated.ok) {
  assert.equal(validated.files.length, 2);
  assert.equal(validated.skippedCount, 1);
}

const empty = validateIngestMediaFiles([file("notes.pdf", "application/pdf")]);
assert.equal(empty.ok, false);

console.log("test-validate-ingest-media-files: ok");
