#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { executeDeepLinkBubbleCandidate } from "../lib/peer-chat/ai-lens/execute-lens-bubble";

const executeSrc = readFileSync(
  join(process.cwd(), "lib/peer-chat/ai-lens/execute-lens-bubble.ts"),
  "utf8",
);

const navigateBlock = executeSrc.slice(
  executeSrc.indexOf('case "navigate":'),
  executeSrc.indexOf('case "transfer":'),
);
assert.ok(
  navigateBlock.includes("openMapPicker"),
  "navigate must return openMapPicker for UI sheet",
);
assert.equal(
  navigateBlock.includes("window.open"),
  false,
  "navigate case must not open map tabs directly",
);

const navResult = executeDeepLinkBubbleCandidate({
  actionType: "navigate",
  label: "둔산동 멕시카나",
  deepLink: "",
  score: 1,
  payload: { place: "둔산동 멕시카나" },
});
assert.deepEqual(navResult.openMapPicker, { place: "둔산동 멕시카나" });

console.log("test-lens-map-no-multi-tab: ok");
