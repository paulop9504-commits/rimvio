#!/usr/bin/env node
/**
 * Concatenate codebase files in user-requested order → docs/CODEBASE_DUMP.txt
 * Skips binary assets (images, jars, fonts, etc.).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "CODEBASE_DUMP.txt");

const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".jar", ".zip", ".pdf",
  ".pbxproj", ".storyboard", ".xcworkspace",
]);

const SKIP_DIR = new Set([
  "node_modules", ".next", ".git", "dist", "build",
  "android/app/build", "ios/App/Pods",
]);

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXT.has(ext)) return false;
  return true;
}

function shouldSkipDir(dirPath) {
  const rel = path.relative(ROOT, dirPath).replace(/\\/g, "/");
  for (const skip of SKIP_DIR) {
    if (rel === skip || rel.startsWith(`${skip}/`)) return true;
  }
  if (rel.includes("/build/") || rel.includes("/intermediates/")) return true;
  return false;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir) || shouldSkipDir(dir)) return acc;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full, acc);
    } else if (isTextFile(full)) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function readBlock(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return `=== ${rel(filePath)} ===\n${content}\n\n`;
  } catch (e) {
    return `=== ${rel(filePath)} ===\n[read error: ${e.message}]\n\n`;
  }
}

function sortedUnder(subdir) {
  return walk(path.join(ROOT, subdir)).sort((a, b) => rel(a).localeCompare(rel(b)));
}

function existingRootConfigs() {
  const names = fs.readdirSync(ROOT);
  const patterns = [
    /^\.env/,
    /^next\.config\./,
    /^tailwind\.config\./,
    /^postcss\.config\./,
    /^tsconfig.*\.json$/,
    /^eslint/,
    /^prettier/,
    /^components\.json$/,
    /^capacitor\.config\./,
    /^middleware\.ts$/,
    /^vercel\.json$/,
    /^playwright\.config\./,
    /^vitest\.config\./,
    /^jest\.config\./,
    /^AGENTS\.md$/,
    /^CLAUDE\.md$/,
    /^README/,
    /^rimvio\.code-workspace$/,
    /^\.npmrc$/,
    /^\.nvmrc$/,
    /^\.editorconfig$/,
  ];
  return names
    .filter((n) => {
      const full = path.join(ROOT, n);
      if (!fs.statSync(full).isFile()) return false;
      if (!isTextFile(full)) return false;
      return patterns.some((re) => re.test(n));
    })
    .map((n) => path.join(ROOT, n))
    .sort((a, b) => a.localeCompare(b));
}

function androidIosConfigs() {
  const candidates = [
    "android/build.gradle",
    "android/settings.gradle",
    "android/variables.gradle",
    "android/gradle.properties",
    "android/capacitor.settings.gradle",
    "android/keystore.properties.example",
    "android/STORE_SHARE_INTENT.example.xml",
    "android/gradle/wrapper/gradle-wrapper.properties",
    "android/app/build.gradle",
    "android/app/capacitor.build.gradle",
    "android/app/proguard-rules.pro",
    "android/app/src/main/AndroidManifest.xml",
    "android/app/src/debug/AndroidManifest.xml",
    "android/app/src/main/res/values/strings.xml",
    "android/app/src/main/res/values/styles.xml",
    "android/app/src/main/res/xml/file_paths.xml",
    "ios/App/Podfile",
    "ios/App/App/Info.plist",
    "ios/RimvioLiveActivityWidget/Info.plist",
    "ios/APP_STORE_REVIEW_NOTES.txt",
  ];
  return candidates
    .map((p) => path.join(ROOT, p))
    .filter((p) => fs.existsSync(p));
}

function publicConfigs() {
  const pub = path.join(ROOT, "public");
  if (!fs.existsSync(pub)) return [];
  return fs
    .readdirSync(pub, { withFileTypes: true })
    .filter((d) => d.isFile() && isTextFile(path.join(pub, d.name)))
    .map((d) => path.join(pub, d.name))
    .sort();
}

function privateConfigs() {
  const dir = path.join(ROOT, "private");
  if (!fs.existsSync(dir)) return [];
  return walk(dir).sort();
}

function githubWorkflows() {
  const dir = path.join(ROOT, ".github");
  if (!fs.existsSync(dir)) return [];
  return walk(dir)
    .filter((f) => f.includes("workflows") || f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort();
}

const sections = [];

// 1. package.json
sections.push(readBlock(path.join(ROOT, "package.json")));

// 2. app/
for (const f of sortedUnder("app")) {
  sections.push(readBlock(f));
}

// 3. hooks/
for (const f of sortedUnder("hooks")) {
  sections.push(readBlock(f));
}

// 4. lib/
for (const f of sortedUnder("lib")) {
  sections.push(readBlock(f));
}

// 5. components/
for (const f of sortedUnder("components")) {
  sections.push(readBlock(f));
}

// 6. public/ configs
for (const f of publicConfigs()) {
  sections.push(readBlock(f));
}

// 7. private/
for (const f of privateConfigs()) {
  sections.push(readBlock(f));
}

// 8. .github/
for (const f of githubWorkflows()) {
  sections.push(readBlock(f));
}

// 9. android/ios configs
for (const f of androidIosConfigs()) {
  sections.push(readBlock(f));
}

// 10. root configs
for (const f of existingRootConfigs()) {
  sections.push(readBlock(f));
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const body = sections.join("");
fs.writeFileSync(OUT, body, "utf8");

const stats = fs.statSync(OUT);
const fileCount = sections.length;
console.log(`Wrote ${fileCount} files → ${OUT}`);
console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB, ${stats.size} bytes`);
