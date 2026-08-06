/**
 * Smoke: DecisionCallout — judgment projection UI contract (not search card).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(process.cwd(), "components/context-workspace/decision-callout.tsx"),
  "utf8",
);
const overlaySrc = readFileSync(
  join(
    process.cwd(),
    "components/context-workspace/workspace-map-compare-overlay.tsx",
  ),
  "utf8",
);

assert.ok(src.includes("export function DecisionCallout"));
assert.ok(src.includes("DecisionCalloutModel"));
assert.ok(src.includes('mode: "compare_decision"'));
assert.ok(src.includes("judgmentKo"));
assert.ok(src.includes("scores.total"));
assert.ok(src.includes("data-decision-callout"));
assert.ok(src.includes("Score"));
assert.ok(src.includes("backdrop-blur"));

// Forbidden search / list card patterns in DecisionCallout
assert.equal(/평점|ratingLabel|priceLabel|amountLabel|비교표/.test(src), false);
assert.equal(/workspacePreviewNearby|galleryImages/.test(src), false);

assert.ok(overlaySrc.includes('from "@/components/context-workspace/decision-callout"'));
assert.ok(overlaySrc.includes("<DecisionCallout"));

console.log("ok decision-callout judgment UI (Apple Maps floating)");
