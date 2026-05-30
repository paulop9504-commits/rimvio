#!/usr/bin/env npx tsx
/**
 * Generate PWA PNG icons from glango-icon.svg.
 * Usage: npm run store:icons
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const SVG_PATH = path.join(ROOT, "public", "glango-icon.svg");
const OUT_DIR = path.join(ROOT, "public", "icons");
const SIZES = [192, 512] as const;

async function main() {
  if (!fs.existsSync(SVG_PATH)) {
    throw new Error(`Missing ${SVG_PATH}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const svg = fs.readFileSync(SVG_PATH, "utf8");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#F2F2F7}
svg{display:block}
</style></head>
<body>${svg}</body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const size of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({
      path: path.join(OUT_DIR, `icon-${size}.png`),
      clip: { x: 0, y: 0, width: size, height: size },
    });
    console.log(`✓ icon-${size}.png`);
  }

  await browser.close();
  console.log(`\nIcons written to public/icons/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
