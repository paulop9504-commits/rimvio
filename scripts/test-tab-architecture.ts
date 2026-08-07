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

assert.equal(actionChatScopeId(null, "search"), "rimvio:search");
assert.equal(actionChatScopeId("link-1", "search"), "rimvio:search");
assert.equal(actionChatScopeId("link-1", "link"), "link-1");
assert.equal(actionChatScopeId(null, "free"), "free");

assert.equal(RIMVIO_PRIMARY_SURFACES.length, 3, "bottom nav = 3 primary surfaces");
assert.deepEqual(
  RIMVIO_PRIMARY_SURFACES.map((s) => s.id),
  ["globe", "field", "peers"],
);
assert.ok(RIMVIO_PRIMARY_SURFACES.every((s) => s.bottomNav));
assert.ok(RIMVIO_SECONDARY_SURFACES.every((s) => !s.bottomNav));
assert.equal(RIMVIO_DEPRECATED_SURFACES[0]?.id, "stack");

assert.equal(LEGACY_SURFACE_REDIRECTS.feed, RIMVIO_REDIRECTS["/feed"]);
assert.equal(LEGACY_SURFACE_REDIRECTS.chat, RIMVIO_REDIRECTS["/chat"]);
assert.equal(RIMVIO_REDIRECTS["/search"], "/");
assert.equal(RIMVIO_REDIRECTS["/chat"], "/");

for (const surface of [...RIMVIO_SECONDARY_SURFACES, ...RIMVIO_DEPRECATED_SURFACES]) {
  if (!surface.route) continue;
  assert.equal(
    SURFACE_ROUTES[surface.id as keyof typeof SURFACE_ROUTES],
    surface.route,
  );
}
for (const surface of RIMVIO_PRIMARY_SURFACES) {
  if (surface.route) {
    assert.equal(SURFACE_ROUTES[surface.id], surface.route);
  }
}

const appNav = readFileSync(join(process.cwd(), "components/app-nav.tsx"), "utf8");
const navHrefs = [...appNav.matchAll(/href:\s*"([^"]+)"/g)]
  .map((m) => m[1])
  .filter((href) => href.startsWith("/"));
assert.deepEqual(
  [...new Set(navHrefs)].sort(),
  rimvioBottomNavRoutes().sort(),
);
assert.ok(!appNav.includes('action: "capture"'));
assert.ok(!appNav.includes("CaptureSheet"));
assert.ok(appNav.includes('data-surface="primary-nav"'));
assert.ok(appNav.includes("isPrimaryNavGlobePath"));

const redirectChecks: Array<{ page: string; needle: string }> = [
  { page: "app/feed/page.tsx", needle: 'redirect(query ? `/?${query}` : "/")' },
  { page: "app/chat/page.tsx", needle: 'redirect("/")' },
  { page: "app/search/page.tsx", needle: 'redirect("/")' },
  { page: "app/archive/page.tsx", needle: 'redirect("/?filter=archive")' },
  { page: "app/globe/page.tsx", needle: 'redirect(query ? `/?${query}` : "/")' },
];
for (const { page, needle } of redirectChecks) {
  const src = readFileSync(join(process.cwd(), page), "utf8");
  assert.ok(src.includes(needle), `${page} redirect`);
}

assert.ok(isGlobeHomePath("/"));
assert.ok(isPrimaryNavGlobePath("/feed"));
assert.ok(!isPrimaryNavGlobePath("/peers"));

for (const [route, pagePath] of Object.entries({
  "/stack": "app/stack/page.tsx",
  "/demo": "app/demo/page.tsx",
  "/metrics": "app/metrics/page.tsx",
})) {
  assert.ok((RIMVIO_DEV_ONLY_ROUTES as readonly string[]).includes(route));
  const src = readFileSync(join(process.cwd(), pagePath), "utf8");
  assert.ok(src.includes("requireDevPage") || src.includes("notFound"));
}

console.log("ok — tab architecture (3-nav · search→globe)");
