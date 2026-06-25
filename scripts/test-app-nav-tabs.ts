#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appNav = readFileSync(join(process.cwd(), "components/app-nav.tsx"), "utf8");
const globals = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

const hrefs = [...appNav.matchAll(/href:\s*"([^"]+)"/g)]
  .map((match) => match[1])
  .filter((href) => href.startsWith("/"));

assert.equal(hrefs.length, 3, `expected 3 nav hrefs, got ${hrefs.length}: ${hrefs.join(", ")}`);
assert.ok(hrefs.includes("/"), "globe home href must be /");
assert.ok(hrefs.includes("/field"), "field href must be /field");
assert.ok(hrefs.includes("/peers"), "people href must be /peers");
assert.ok(!hrefs.includes("/calendar"), "calendar tab must be removed from app nav");
assert.ok(!hrefs.includes("/globe"), "globe tab must be removed from app nav");
assert.ok(!appNav.includes("Globe2"), "Globe2 icon import must be removed");
assert.ok(
  appNav.includes('icon: "capture"'),
  "capture tab must use + action",
);
const tabEntries = appNav.match(
  /href:\s*"\/[^"]*"|action:\s*"capture"/g,
) ?? [];
assert.equal(
  tabEntries.length,
  4,
  `bottom nav must be 4 tabs (globe, field, people, +), got: ${tabEntries.join(", ")}`,
);
assert.ok(
  !appNav.includes('href: "/calendar"'),
  "calendar must not return to bottom nav",
);
assert.ok(
  !appNav.includes('href: "/search"') || !appNav.includes("nav tabs"),
  "search must not be a bottom nav tab",
);
assert.ok(
  appNav.includes('data-nav-href') && appNav.includes("<button"),
  "nav tabs must use button controls for reliable touch",
);
assert.ok(
  globals.includes(".rimvio-bottom-nav-pill"),
  "bottom nav must use floating pill container",
);
assert.ok(
  appNav.includes("rimvio-bottom-nav-icon-pill--active"),
  "active tab must use inner pill highlight",
);
assert.ok(
  appNav.includes("openFieldSheet") &&
    !appNav.includes('router.push("/field")') &&
    !appNav.includes("router.push('/field')"),
  "field tab must open global sheet — never navigate to /field route",
);
assert.ok(
  appNav.includes("createPortal(bar, document.body)"),
  "bottom nav must portal directly to document.body",
);

console.log("test-app-nav-tabs: ok", hrefs.join(", "));
