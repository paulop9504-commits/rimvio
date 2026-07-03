#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { actionChatScopeId } from "../lib/action-chat/chat-store";
import {
  LEGACY_SURFACE_REDIRECTS,
  RIMVIO_DEPRECATED_SURFACES,
  RIMVIO_PRIMARY_SURFACES,
  RIMVIO_REDIRECTS,
  RIMVIO_SECONDARY_SURFACES,
  SURFACE_ROUTES,
  rimvioBottomNavRoutes,
  isGlobeHomePath,
  isPrimaryNavGlobePath,
  RIMVIO_DEV_ONLY_ROUTES,
} from "../lib/surface-registry";

// --- chat scope (capture hub) ---
assert.equal(actionChatScopeId(null, "search"), "rimvio:search");
assert.equal(actionChatScopeId("link-1", "search"), "rimvio:search");
assert.equal(actionChatScopeId("link-1", "link"), "link-1");
assert.equal(actionChatScopeId(null, "free"), "free");

// --- SSOT shape ---
assert.equal(RIMVIO_PRIMARY_SURFACES.length, 4, "bottom nav = 4 primary surfaces");
assert.equal(
  RIMVIO_PRIMARY_SURFACES.filter((s) => s.bottomNav).length,
  4,
  "all primary surfaces are bottom nav",
);
assert.ok(
  RIMVIO_SECONDARY_SURFACES.every((s) => !s.bottomNav),
  "secondary surfaces must not be bottom nav",
);
assert.equal(RIMVIO_DEPRECATED_SURFACES.length, 1, "stack is sole deprecated primary nav candidate");
assert.equal(RIMVIO_DEPRECATED_SURFACES[0]?.id, "stack");

// --- layers re-export parity ---
assert.equal(LEGACY_SURFACE_REDIRECTS.feed, RIMVIO_REDIRECTS["/feed"]);
assert.equal(LEGACY_SURFACE_REDIRECTS.chat, RIMVIO_REDIRECTS["/chat"]);
assert.equal(LEGACY_SURFACE_REDIRECTS.archive, RIMVIO_REDIRECTS["/archive"]);
assert.equal(LEGACY_SURFACE_REDIRECTS.globeAlias, RIMVIO_REDIRECTS["/globe"]);

// --- SURFACE_ROUTES covers all registered surfaces ---
for (const surface of [...RIMVIO_SECONDARY_SURFACES, ...RIMVIO_DEPRECATED_SURFACES]) {
  assert.equal(
    SURFACE_ROUTES[surface.id as keyof typeof SURFACE_ROUTES],
    surface.route,
    `SURFACE_ROUTES missing ${surface.id}`,
  );
}
for (const surface of RIMVIO_PRIMARY_SURFACES) {
  if (surface.route) {
    assert.equal(SURFACE_ROUTES[surface.id], surface.route);
  }
}

// --- app-nav ↔ SSOT ---
const appNav = readFileSync(join(process.cwd(), "components/app-nav.tsx"), "utf8");
const navHrefs = [...appNav.matchAll(/href:\s*"([^"]+)"/g)]
  .map((m) => m[1])
  .filter((href) => href.startsWith("/"));
const expectedNavHrefs = rimvioBottomNavRoutes().sort();
assert.deepEqual([...new Set(navHrefs)].sort(), expectedNavHrefs, "app-nav hrefs must match SSOT bottom nav routes");
assert.ok(appNav.includes('action: "capture"'), "capture tab must be sheet action, not href");
assert.ok(appNav.includes('data-surface="primary-nav"'), "app-nav must mark primary-nav surface");
assert.ok(appNav.includes("isPrimaryNavGlobePath"), "app-nav must use SSOT globe path helper");

// --- redirect pages ↔ SSOT ---
const redirectChecks: Array<{ page: string; needle: string }> = [
  { page: "app/feed/page.tsx", needle: 'redirect(query ? `/?${query}` : "/")' },
  { page: "app/chat/page.tsx", needle: 'redirect("/search")' },
  { page: "app/archive/page.tsx", needle: 'redirect("/?filter=archive")' },
  { page: "app/globe/page.tsx", needle: 'redirect(query ? `/?${query}` : "/")' },
];
for (const { page, needle } of redirectChecks) {
  const src = readFileSync(join(process.cwd(), page), "utf8");
  assert.ok(src.includes(needle), `${page} must redirect per RIMVIO_REDIRECTS`);
}

// --- globe path helpers ---
assert.ok(isGlobeHomePath("/"));
assert.ok(isGlobeHomePath("/globe/recall"));
assert.ok(!isGlobeHomePath("/search"));
assert.ok(isPrimaryNavGlobePath("/feed"));
assert.ok(!isPrimaryNavGlobePath("/peers"));

// --- dev-only routes gated (primary experimental surfaces) ---
const devGatedPages: Record<string, string> = {
  "/stack": "app/stack/page.tsx",
  "/demo": "app/demo/page.tsx",
  "/metrics": "app/metrics/page.tsx",
};
for (const [route, pagePath] of Object.entries(devGatedPages)) {
  assert.ok(
    (RIMVIO_DEV_ONLY_ROUTES as readonly string[]).includes(route),
    `${route} must be listed in RIMVIO_DEV_ONLY_ROUTES`,
  );
  const src = readFileSync(join(process.cwd(), pagePath), "utf8");
  assert.ok(src.includes("requireDevPage"), `${pagePath} must call requireDevPage()`);
}

// --- production chrome must not link dev-only routes ---
const PROD_CHROME_FILES = [
  "components/app-nav.tsx",
  "components/app-shell.tsx",
  "components/globe/globe-home-client.tsx",
  "components/globe/globe-utility-menu.tsx",
] as const;
const DEV_ROUTE_NEEDLES = ["/metrics", "/dev/", "/demo", "/stack", "/actions/"];
for (const rel of PROD_CHROME_FILES) {
  const src = readFileSync(join(process.cwd(), rel), "utf8");
  for (const needle of DEV_ROUTE_NEEDLES) {
    assert.ok(
      !src.includes(needle),
      `${rel} must not link dev-only route ${needle}`,
    );
  }
}

console.log("test-tab-architecture: ok");
