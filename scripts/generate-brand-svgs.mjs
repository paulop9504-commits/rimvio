#!/usr/bin/env node
/**
 * Lightweight Rimvio SVG marks (smiley vector, no 500KB embedded PNG).
 * Usage: node scripts/generate-brand-svgs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

const SMILEY_INNER = `
  <circle cx="28" cy="28" r="26" fill="#FFFFFF" stroke="#3F3F46" stroke-width="2"/>
  <circle cx="18.5" cy="23.5" r="6.2" fill="none" stroke="#C084FC" stroke-width="1.85"/>
  <circle cx="18.5" cy="23.5" r="2.35" fill="#5B21B6"/>
  <circle cx="37.5" cy="23.5" r="6.2" fill="none" stroke="#C084FC" stroke-width="1.85"/>
  <circle cx="37.5" cy="23.5" r="2.35" fill="#5B21B6"/>
  <path d="M15.5 34.5 Q28 43.5 40.5 34.5" stroke="#C084FC" stroke-width="2.1" stroke-linecap="round" fill="none"/>
`;

function iconSvg(bg = "#F2F2F7") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="${bg}"/>
  <g transform="translate(128 128) scale(4.57142857">${SMILEY_INNER}
  </g>
</svg>`;
}

function markSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <g transform="translate(8 8) scale(2)">${SMILEY_INNER}
  </g>
</svg>`;
}

const files = [
  ["rimvio-icon.svg", iconSvg("#F2F2F7")],
  ["rimvio-feed-mark.svg", iconSvg("#1c1c1c")],
  ["rimvio-mark.svg", markSvg()],
];

for (const [name, content] of files) {
  if (!content) continue;
  const out = path.join(PUBLIC, name);
  fs.writeFileSync(out, content.trim() + "\n", "utf8");
  console.log(`✓ public/${name} (${fs.statSync(out).size} bytes)`);
}

const legacy = ["glang-icon.svg", "glang-mark.svg", "glang-wordmark.svg", "blink-eye.svg"];
for (const name of legacy) {
  const p = path.join(PUBLIC, name);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`✗ removed legacy public/${name}`);
  }
}

const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" fill="none">
  <g transform="translate(24 24) scale(2)">${SMILEY_INNER}
  </g>
  <defs>
    <linearGradient id="rimvio-wm" x1="132" y1="48" x2="420" y2="108" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7C3AED"/>
      <stop offset="0.5" stop-color="#A855F7"/>
      <stop offset="1" stop-color="#D946EF"/>
    </linearGradient>
  </defs>
  <text x="132" y="98" fill="url(#rimvio-wm)" font-family="Inter, Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="72" font-weight="700" letter-spacing="-2">Rimvio</text>
  <text x="132" y="132" fill="#71717A" font-family="Inter, Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="22" font-weight="500" letter-spacing="0.5">림비오 · glance</text>
</svg>
`;
fs.writeFileSync(path.join(PUBLIC, "rimvio-wordmark.svg"), wordmark.trim() + "\n", "utf8");
console.log(`✓ public/rimvio-wordmark.svg`);

console.log("\nDone. Run: npm run brand:transparent-logo && npm run store:icons");
