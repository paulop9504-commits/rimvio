import assert from "node:assert/strict";
import { draftHasExplicitGps } from "../lib/globe/draft-has-explicit-gps";
import type { GlobePhotoIngestDraft } from "../lib/globe/prepare-globe-photo-ingest-draft";

const base: GlobePhotoIngestDraft = {
  mediaFiles: [],
  peeks: [],
  clusters: [
    {
      id: "c0",
      indices: [0],
      ambiguous: false,
      ambiguousReasons: [],
      anchor: {
        capturedAtIso: new Date().toISOString(),
        lat: 37.5,
        lng: 127.0,
        placeLabel: "서울",
        hasGps: true,
      },
    },
  ],
  candidates: [],
  totalFiles: 1,
};

assert.equal(draftHasExplicitGps(base), true);
assert.equal(
  draftHasExplicitGps({
    ...base,
    clusters: [
      {
        ...base.clusters[0]!,
        anchor: { ...base.clusters[0]!.anchor, hasGps: false },
      },
    ],
  }),
  false,
);

console.log("test-draft-has-explicit-gps: ok");
