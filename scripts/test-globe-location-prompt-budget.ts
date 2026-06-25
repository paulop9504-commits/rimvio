import assert from "node:assert/strict";
import {
  canOfferGlobeLocationPrompt,
  markGlobeLocationPromptOffered,
  resetGlobeLocationPromptBudgetForTests,
} from "../lib/globe/globe-location-prompt-budget";
import { pickSurfacedLocationConfirms } from "../lib/globe/pick-surfaced-location-confirms";

resetGlobeLocationPromptBudgetForTests();
const noon = new Date("2026-06-06T12:00:00+09:00");

assert.equal(canOfferGlobeLocationPrompt(noon), true);

markGlobeLocationPromptOffered(noon);
assert.equal(canOfferGlobeLocationPrompt(noon), false);
assert.equal(
  canOfferGlobeLocationPrompt(new Date("2026-06-07T09:00:00+09:00")),
  true,
);

resetGlobeLocationPromptBudgetForTests();
const rows = pickSurfacedLocationConfirms(
  [
    {
      eventId: "e1",
      title: "체류",
      place: "둔산동",
      datetime: noon.toISOString(),
      kind: "gps_dwell",
    },
    {
      eventId: "e2",
      title: "체류2",
      place: "서울",
      datetime: noon.toISOString(),
      kind: "gps_dwell",
    },
  ],
  { now: noon },
);
assert.equal(rows.length, 1);
assert.equal(rows[0]?.eventId, "e1");
assert.equal(canOfferGlobeLocationPrompt(noon), false);

console.log("test-globe-location-prompt-budget: ok");
