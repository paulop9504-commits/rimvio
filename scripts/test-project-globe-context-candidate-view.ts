#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type {
  BulkMediaSpacetimeCluster,
  BulkMediaSpacetimePeek,
} from "../lib/feed/bulk-media-spacetime-types";
import { projectGlobeContextCandidateViews } from "../lib/globe/project-globe-context-candidate-view";

const peeks: BulkMediaSpacetimePeek[] = [
  {
    index: 0,
    capturedAtIso: "2026-06-15T14:00:00.000Z",
    lat: 37.511,
    lng: 127.098,
    placeLabel: "잠실 롯데월드",
    resolveSource: "exif_gps",
    mediaKind: "photo",
    hasGps: true,
  },
  {
    index: 1,
    capturedAtIso: "2026-06-15T15:30:00.000Z",
    lat: 37.512,
    lng: 127.099,
    placeLabel: "잠실 롯데월드",
    resolveSource: "exif_gps",
    mediaKind: "photo",
    hasGps: true,
  },
];

const clusters: BulkMediaSpacetimeCluster[] = [
  {
    id: "c0",
    indices: [0, 1],
    anchor: peeks[0]!,
    ambiguous: false,
    ambiguousReasons: [],
    title: "잠실 나들이",
    placeLabel: "잠실 롯데월드",
  },
];

const views = projectGlobeContextCandidateViews({ clusters, peeks });
assert.equal(views.length, 1);
assert.equal(views[0]!.title, "잠실 나들이");
assert.equal(views[0]!.placeLabel, "잠실 롯데월드");
assert.equal(views[0]!.fileCount, 2);
assert.match(views[0]!.dateLabel, /2026/);

const fallback = projectGlobeContextCandidateViews({
  clusters: [
    {
      id: "c1",
      indices: [0],
      anchor: peeks[0]!,
      ambiguous: true,
      ambiguousReasons: ["mixed_gps"],
    },
  ],
  peeks: [peeks[0]!],
});
assert.equal(fallback[0]!.title, "잠실 롯데월드");
assert.equal(fallback[0]!.ambiguous, true);

console.log("test-project-globe-context-candidate-view: ok");
