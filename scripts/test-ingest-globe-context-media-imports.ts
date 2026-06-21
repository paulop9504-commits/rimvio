#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("lib/feed/ingest-globe-context-media.ts");
const source = readFileSync(sourcePath, "utf8");

assert.match(
  source,
  /import\s*\{[^}]*listEventCandidates[^}]*\}\s*from\s*"@\/lib\/events\/event-store"/s,
  "listEventCandidates must be imported from event-store",
);

assert.match(
  source,
  /const events = listEventCandidates\(\)/,
  "resolveGlobePhotoTarget must call listEventCandidates",
);

console.log("test-ingest-globe-context-media-imports: ok");
