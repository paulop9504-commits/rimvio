#!/usr/bin/env npx tsx
/**
 * STEP7 — compose focus / zoom-coast / hydration storm guards stay wired.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  isGlobeComposeInputFocused,
  setGlobeComposeInputFocused,
} from "../lib/globe/compose-input-focus";

const root = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

{
  setGlobeComposeInputFocused(false);
  assert.equal(isGlobeComposeInputFocused(), false);
  setGlobeComposeInputFocused(true);
  assert.equal(isGlobeComposeInputFocused(), true);
  setGlobeComposeInputFocused(false);
}

{
  const overlay = readSrc("components/globe/globe-context-brain-map-overlay.tsx");
  assert.match(overlay, /data-globe-interacting/);
  assert.match(overlay, /isGlobeComposeInputFocused/);
}

{
  const prompt = readSrc(
    "components/globe/globe-context-condition-prompt-frame.tsx",
  );
  assert.match(prompt, /isGlobeComposeInputFocused/);
  assert.match(prompt, /startTransition/);
}

{
  const pinBar = readSrc("components/globe/globe-context-condition-pin-bar.tsx");
  assert.match(pinBar, /isGlobeComposeInputFocused/);
}

{
  const layout = readSrc("app/layout.tsx");
  assert.match(layout, /suppressHydrationWarning/);
}

{
  const globe3d = readSrc("components/experience/rimvio-globe-3d.tsx");
  assert.match(
    globe3d,
    /coast|interacting|gesture/iu,
    "zoom coast / interacting guards must remain in globe-3d",
  );
}

console.log("test-compose-focus-storm-guards: ok");
