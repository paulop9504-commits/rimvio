#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appNav = readFileSync(join(process.cwd(), "components/app-nav.tsx"), "utf8");
const globals = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

const hrefs = [...appNav.matchAll(/href:\s*"([^"]+)"/g)].map((match) => match[1]);

assert.equal(hrefs.length, 4, `expected 4 nav tabs, got ${hrefs.length}: ${hrefs.join(", ")}`);
assert.ok(!hrefs.includes("/globe"), "globe tab must be removed from app nav");
assert.ok(!appNav.includes("Globe2"), "Globe2 icon import must be removed");
assert.ok(
  globals.includes("repeat(4, minmax(0, 1fr))"),
  "bottom nav grid must be 4 columns",
);

console.log("test-app-nav-tabs: ok", hrefs.join(", "));
