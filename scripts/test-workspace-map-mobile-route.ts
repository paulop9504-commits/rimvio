#!/usr/bin/env npx tsx
/**
 * Mobile RealityMap must not force Placeholder via `compact`.
 * compact = denser camera; preferPlaceholder = chat teaser without tiles.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(process.cwd(), "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);

assert.ok(
  /if \(props\.preferPlaceholder\)/.test(src),
  "placeholder gate must key off preferPlaceholder only",
);
assert.ok(
  !/if \(props\.preferPlaceholder \|\| props\.compact\)/.test(src),
  "compact must not force PlaceholderPinMap (iOS PWA blank map)",
);

const reality = readFileSync(
  join(process.cwd(), "components/mobile-workspace/RealityMap.tsx"),
  "utf8",
);
assert.ok(
  /\bcompact\b/.test(reality),
  "RealityMap still passes denser compact framing",
);
assert.ok(
  !/preferPlaceholder/.test(reality),
  "RealityMap must not preferPlaceholder",
);

console.log("ok workspace-map-mobile-route");
