#!/usr/bin/env node
/**
 * CI lint gate — error count cannot grow past baseline (see lib-boundaries pattern).
 * Run: node scripts/lint-ci.mjs --update  (after intentional debt paydown)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = path.join(import.meta.dirname, "..");
const BASELINE_PATH = path.join(REPO, "scripts", "eslint-baseline.json");

function toPosixRel(absPath) {
  return path.relative(REPO, absPath).split(path.sep).join("/");
}

function violationKey(rel, msg) {
  // Stable across OS — eslint message text embeds platform-specific paths.
  return `${rel}|${msg.line}|${msg.ruleId ?? "unknown"}`;
}

function runEslint() {
  const result = spawnSync("npx", ["eslint", ".", "-f", "json"], {
    cwd: REPO,
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let parsed = [];
  try {
    parsed = JSON.parse(result.stdout || "[]");
  } catch {
    console.error("lint-ci: failed to parse eslint JSON output");
    if (result.stderr) {
      console.error(result.stderr.slice(0, 2000));
    }
    process.exit(1);
  }

  const keys = [];
  for (const file of parsed) {
    const rel = toPosixRel(path.resolve(REPO, file.filePath));
    for (const msg of file.messages) {
      if (msg.severity !== 2) {
        continue;
      }
      keys.push(violationKey(rel, msg));
    }
  }

  keys.sort();
  return keys;
}

const keys = runEslint();

if (process.argv.includes("--update")) {
  fs.writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        errorCount: keys.length,
        keys,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`lint-ci: baseline updated → ${keys.length} errors`);
  process.exit(0);
}

let baseline = { errorCount: 0, keys: [] };
try {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
} catch {
  console.error(
    `lint-ci: missing ${BASELINE_PATH} — run: node scripts/lint-ci.mjs --update`,
  );
  process.exit(1);
}

const baselineKeySet = new Set(baseline.keys ?? []);
const newErrors = keys.filter((key) => !baselineKeySet.has(key));

if (keys.length > baseline.errorCount || newErrors.length > 0) {
  console.error(
    `lint-ci: FAIL ${keys.length} errors (baseline ${baseline.errorCount}); ${newErrors.length} new`,
  );
  for (const key of newErrors.slice(0, 30)) {
    console.error(`  ${key}`);
  }
  if (newErrors.length > 30) {
    console.error(`  ... and ${newErrors.length - 30} more new`);
  }
  process.exit(1);
}

console.log(`lint-ci: ok (${keys.length}/${baseline.errorCount} at baseline; 0 new)`);
process.exit(0);
