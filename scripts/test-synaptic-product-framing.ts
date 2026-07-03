#!/usr/bin/env npx tsx
/**
 * Product framing guard — synaptic context graph, trigger recall, re-execution.
 * @see docs/RIMVIO_CONSTITUTION.md · docs/ACTION_OS_SPINE.md · docs/RIMVIO_EXPERIENCE_LAYERS.md
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readDoc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const constitution = readDoc("docs/RIMVIO_CONSTITUTION.md");
const spine = readDoc("docs/ACTION_OS_SPINE.md");
const experienceLayers = readDoc("docs/RIMVIO_EXPERIENCE_LAYERS.md");
const synapticLayer = readDoc("docs/RIMVIO_SYNAPTIC_LAYER.md");
const storyLayer = readFileSync(join(root, "lib/copy/story-layer.ts"), "utf8");

// --- Constitution: synaptic + trigger + re-execute ---
assert.match(constitution, /synaptic context graph/i, "constitution must name synaptic context graph");
assert.match(constitution, /trigger edge/i, "constitution must frame RECALL as trigger edge");
assert.match(constitution, /re-execut/i, "constitution must frame ACTION as re-execution");
assert.match(constitution, /맥락이 연결되면, Rimvio가 다시 실행한다/, "constitution must include KO one-liner");
assert.match(constitution, /NOT a passive memory OS/i, "constitution must reject passive memory OS framing");

// --- Spine: active loop is execution spine, not recall-only ---
assert.match(spine, /@ Action Contract Registry/i, "spine must include @ registry");
assert.match(spine, /prep surface/i, "spine must include prep surface");
assert.match(spine, /Synaptic law/i, "spine must document synaptic law");
assert.match(spine, /MAIN ranking/i, "spine must include MAIN ranking rollup");
assert.doesNotMatch(
  spine,
  /only build recall/i,
  "spine must not be recall-only",
);

// --- Experience layers: RECALL as trigger ---
assert.match(experienceLayers, /Trigger edge/i, "experience layers must frame RECALL as trigger edge");
assert.match(experienceLayers, /re-execut/i, "experience layers must describe re-execution in ACTION");
assert.match(experienceLayers, /synaptic connection/i, "experience layers must describe synaptic moat");

// --- Synaptic layer cross-links ---
assert.match(synapticLayer, /ACTION_OS_SPINE\.md/, "synaptic layer must cross-link spine");
assert.match(synapticLayer, /RIMVIO_CONSTITUTION\.md/, "synaptic layer must cross-link constitution");

// --- Story layer L2 nouns ---
assert.match(storyLayer, /synapticConnection/, "story-layer L2 must include synaptic connection noun");
assert.match(storyLayer, /triggerEdge/, "story-layer L2 must include trigger edge noun");
assert.match(storyLayer, /reExecute/, "story-layer L2 must include re-execute noun");

console.log("test-synaptic-product-framing: ok");
