#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type {
  BulkMediaSpacetimeCluster,
  BulkMediaSpacetimePeek,
} from "../lib/feed/bulk-media-spacetime-types";
import { applyPlaceOverrideToPhotoDraft } from "../lib/globe/apply-place-override-to-photo-draft";
import type { GlobePhotoIngestDraft } from "../lib/globe/prepare-globe-photo-ingest-draft";
import { projectGlobeContextCandidateViews } from "../lib/globe/project-globe-context-candidate-view";

function buildDraft(): GlobePhotoIngestDraft {
  const peek: BulkMediaSpacetimePeek = {
    index: 0,
    capturedAtIso: "2026-07-04T15:00:00+09:00",
    lat: 37.5665,
    lng: 126.978,
    placeLabel: "서울 시청",
    resolveSource: "gps_live",
    mediaKind: "photo",
    hasGps: true,
  };
  const cluster: BulkMediaSpacetimeCluster = {
    id: "cluster:manual-override",
    indices: [0],
    anchor: peek,
    ambiguous: false,
    ambiguousReasons: [],
    placeLabel: "서울 시청",
    title: "서울 흔적",
    llmConfidence: "high",
  };
  const peeks = [peek];
  const clusters = [cluster];
  return {
    mediaFiles: [],
    peeks,
    clusters,
    candidates: projectGlobeContextCandidateViews({ clusters, peeks }),
    totalFiles: 1,
  };
}

const patched = applyPlaceOverrideToPhotoDraft(buildDraft(), {
  placeLabel: "오사카",
});

assert.equal(patched.clusters[0]?.placeLabel, "오사카");
assert.equal(
  patched.clusters[0]?.anchor.placeLabel,
  "오사카",
  "manual place text should replace the stale GPS label",
);
assert.equal(
  patched.clusters[0]?.anchor.lat,
  null,
  "manual place text should clear inherited GPS latitude when no explicit anchor exists",
);
assert.equal(
  patched.clusters[0]?.anchor.lng,
  null,
  "manual place text should clear inherited GPS longitude when no explicit anchor exists",
);
assert.equal(
  patched.clusters[0]?.anchor.hasGps,
  false,
  "manual place text without explicit coordinates should no longer count as GPS-confirmed",
);

console.log("test-photo-place-manual-override: ok");
