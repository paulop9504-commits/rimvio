import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  formatPinDateLabel,
  parsePinDateMs,
  resolveEventPinStartedAtIso,
} from "../lib/globe/format-pin-date-label";

assert.equal(formatPinDateLabel("2027-04-12T15:00:00+09:00"), "2027.04.12");
assert.equal(formatPinDateLabel("1970-01-01T00:00:00.000Z"), null);
assert.equal(formatPinDateLabel("0"), null);
assert.equal(parsePinDateMs(null), null);

const dwellEvent: EventCandidate = {
  id: "dwell-1",
  title: "4시간 57분 체류",
  category: "place",
  source: "gps",
  lifecycle: "active",
  datetime: "1970-01-01T00:00:00.000Z",
  place: "4시간 57분 체류",
  confidence: 0.8,
  metadata: {
    feedCaptures: [
      {
        id: "dwell-cap-1",
        kind: "gps_dwell",
        capturedAtIso: "2026-06-15T14:30:00.000Z",
        dwellMinutes: 297,
        autoAttached: true,
        verified: true,
      },
    ],
  },
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
};

assert.equal(
  resolveEventPinStartedAtIso(dwellEvent),
  "2026-06-15T14:30:00.000Z",
);
assert.equal(
  formatPinDateLabel(resolveEventPinStartedAtIso(dwellEvent)),
  "2026.06.15",
);

console.log("--- format pin date label ---");
console.log("ok");
