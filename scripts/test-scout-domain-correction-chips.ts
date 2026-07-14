import assert from "node:assert/strict";
import {
  buildScoutDomainCorrectionChips,
  resolveIntendedScoutKind,
} from "@/lib/globe/context-condition-ai/build-scout-domain-correction-chips";

assert.equal(
  resolveIntendedScoutKind({ triggerMessage: "근처 약국 찾아줘" }),
  "amenity",
);
assert.equal(
  resolveIntendedScoutKind({
    triggerMessage: "호텔",
    resourceTypes: ["hotel"],
  }),
  "lodging",
);

const clean = buildScoutDomainCorrectionChips({
  triggerMessage: "약국",
  resourceTypes: ["amenity"],
  recommendations: [
    { kind: "amenity" },
    { kind: "amenity" },
  ],
  keepOnlyLabel: (focus) => `${focus}만 볼까요?`,
  stripLabel: (focus) => `${focus}는 빼둘게요`,
});
assert.equal(clean.length, 0);

const bleed = buildScoutDomainCorrectionChips({
  triggerMessage: "근처 약국",
  resourceTypes: ["amenity"],
  recommendations: [
    { kind: "amenity" },
    { kind: "lodging" },
    { kind: "amenity" },
  ],
  keepOnlyLabel: (focus) => `${focus}만 볼까요?`,
  stripLabel: (focus) => `${focus}는 빼둘게요`,
});
assert.ok(bleed.length >= 1);
assert.ok(bleed.some((chip) => chip.id === "keep_amenity"));
assert.ok(bleed.some((chip) => chip.labelKo.includes("약국")));
assert.ok(bleed.some((chip) => chip.id === "strip_lodging"));
assert.ok(bleed.some((chip) => chip.labelKo.includes("숙소")));

console.log("test-scout-domain-correction-chips: ok");
