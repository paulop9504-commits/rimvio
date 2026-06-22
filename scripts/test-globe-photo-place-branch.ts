#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { BulkMediaSpacetimeCluster, BulkMediaSpacetimePeek } from "../lib/feed/bulk-media-spacetime-types";
import { resolveGlobePhotoPlaceBranch } from "../lib/globe/resolve-globe-photo-place-branch";
import type { GlobePhotoIngestDraft } from "../lib/globe/prepare-globe-photo-ingest-draft";
import { projectGlobeContextCandidateViews } from "../lib/globe/project-globe-context-candidate-view";

function buildDraft(input: {
  placeLabel: string | null;
  lat: number | null;
  lng: number | null;
  ambiguous?: boolean;
}): GlobePhotoIngestDraft {
  const peek: BulkMediaSpacetimePeek = {
    index: 0,
    capturedAtIso: "2026-06-01T12:00:00+09:00",
    lat: input.lat,
    lng: input.lng,
    placeLabel: input.placeLabel,
    resolveSource: input.lat != null ? "exif" : "unknown",
    mediaKind: "photo",
    hasGps: input.lat != null && input.lng != null,
  };
  const cluster: BulkMediaSpacetimeCluster = {
    id: "cluster:0",
    indices: [0],
    anchor: peek,
    ambiguous: input.ambiguous === true,
    ambiguousReasons: input.ambiguous ? ["spread"] : [],
    placeLabel: input.placeLabel,
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

function main() {
  const caseA = resolveGlobePhotoPlaceBranch(
    buildDraft({ placeLabel: "에버랜드", lat: 37.29, lng: 127.2 }),
  );
  assert.equal(caseA.branch, "case_a");
  assert.equal(caseA.placeLabel, "에버랜드");

  const caseB = resolveGlobePhotoPlaceBranch(
    buildDraft({ placeLabel: null, lat: null, lng: null }),
  );
  assert.equal(caseB.branch, "case_b");

  const coordsOnly = resolveGlobePhotoPlaceBranch(
    buildDraft({ placeLabel: "37.2900°, 127.2000°", lat: 37.29, lng: 127.2 }),
  );
  assert.equal(coordsOnly.branch, "case_b");

  console.log("test-globe-photo-place-branch: ok");
}

main();
