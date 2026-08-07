#!/usr/bin/env npx tsx
/**
 * Workspace map style — same-origin voyager raster (mobile blank-map fix).
 */
import assert from "node:assert/strict";
import { buildWorkspaceRasterStyle } from "@/lib/context-workspace/map/workspace-map-style";

const style = buildWorkspaceRasterStyle();
assert.equal(style.version, 8);
assert.ok(style.sources.rimvio_voyager);
const tiles = (style.sources.rimvio_voyager as { tiles: string[] }).tiles;
assert.ok(tiles[0]?.includes("/api/globe/tile"));
assert.ok(tiles[0]?.includes("style=voyager"));
assert.ok(style.layers.some((l) => l.id === "rimvio_voyager"));

console.log("ok workspace-map-style");
