#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveContextTriggerOpenOptions } from "../lib/globe/context-triggers/resolve-context-trigger-open-options";

assert.deepEqual(
  resolveContextTriggerOpenOptions({
    kind: "time_recall",
    mediaPreviews: [{ id: "m1", imageUrl: "https://x.test/a.jpg", mediaContextId: null, kind: "photo" }],
  }),
  { openSheet: false, mapTap: true },
);

assert.deepEqual(
  resolveContextTriggerOpenOptions({
    kind: "person_recall",
    mediaPreviews: [],
  }),
  { openSheet: true, mapTap: false, sheetPage: "context" },
);

assert.deepEqual(
  resolveContextTriggerOpenOptions({
    kind: "place_recall",
    mediaPreviews: [],
  }),
  { openSheet: false, mapTap: true },
);

console.log("test-context-trigger-open-options: ok");
