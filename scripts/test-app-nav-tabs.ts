#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appNav = readFileSync(join(process.cwd(), "components/app-nav.tsx"), "utf8");
const globals = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

const hrefs = [...appNav.matchAll(/href:\s*"([^"]+)"/g)]
  .map((match) => match[1])
  .filter((href) => href.startsWith("/"));

assert.equal(hrefs.length, 3, `expected 3 nav hrefs, got ${hrefs.length}`);
assert.ok(hrefs.includes("/"));
assert.ok(hrefs.includes("/field"));
assert.ok(hrefs.includes("/peers"));
assert.ok(!hrefs.includes("/search"));
assert.ok(!appNav.includes('icon: "capture"'));
assert.ok(!appNav.includes("CaptureSheet"));
assert.ok(!appNav.includes('action: "capture"'));
assert.ok(appNav.includes("data-nav-href") && appNav.includes("<button"));
assert.ok(appNav.includes('href={tab.href}') || appNav.includes('href="/peers"'));
assert.ok(appNav.includes("data-nav-link"));
assert.ok(appNav.includes("<Link"));
assert.ok(
  !appNav.includes("router.push(href)"),
  "Globe/친구 Link must own navigation — extra router.push cancels /peers",
);
assert.ok(globals.includes(".rimvio-bottom-nav-pill"));
assert.ok(appNav.includes("rimvio-bottom-nav-icon-pill--active"));
assert.ok(
  appNav.includes("openFieldDashboardFromBottomNav") &&
    appNav.includes("closeFieldSheet"),
);
assert.ok(appNav.includes("useFieldNavBadge"));
assert.ok(appNav.includes("createPortal(bar, document.body)"));

console.log("test-app-nav-tabs: ok", hrefs.join(", "));
