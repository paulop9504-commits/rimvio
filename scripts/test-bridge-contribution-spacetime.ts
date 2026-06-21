import assert from "node:assert/strict";
import { normalizeBridgeContributionCapture } from "../lib/experience-bridge/normalize-bridge-contribution-capture";
import { mergeBridgeCaptureSpacetime } from "../lib/experience-bridge/normalize-bridge-contribution-capture";

const base = {
  id: "cap-1",
  kind: "photo" as const,
  capturedAtIso: "2026-06-19T09:00:00.000Z",
  url: "https://cdn.example.com/a.jpg",
};

const enriched = mergeBridgeCaptureSpacetime(base, {
  fileHash: "abc123",
  takenAtIso: "2026-06-19T08:55:00.000Z",
  geohash: "wy77j0k",
  lat: 37.5665,
  lng: 126.978,
  storagePath: "user-1/bridge/event/cap-1.jpg",
  byteSize: 1024,
});

assert.equal(enriched.fileHash, "abc123");
assert.equal(enriched.takenAtIso, "2026-06-19T08:55:00.000Z");
assert.equal(enriched.geohash, "wy77j0k");
assert.equal(enriched.storagePath?.includes("cap-1"), true);

let threw = false;
try {
  normalizeBridgeContributionCapture({
    ...base,
    id: "",
  });
} catch {
  threw = true;
}
assert.equal(threw, true);

console.log("test-bridge-contribution-spacetime: ok");
