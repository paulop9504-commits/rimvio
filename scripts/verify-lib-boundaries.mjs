#!/usr/bin/env node
/**
 * CI gate — lib/ cross-domain import boundaries cannot grow past baseline.
 * Run `node scripts/verify-lib-boundaries.mjs --update` after fixing violations.
 *
 * @see docs/LIB_BOUNDARIES.md
 */
import fs from "node:fs";
import path from "node:path";
import { boundaryRules, libDomain } from "./lib-boundary-rules.mjs";

const REPO = path.join(import.meta.dirname, "..");
const LIB_ROOT = path.join(REPO, "lib");
const BASELINE_PATH = path.join(REPO, "scripts", "lib-boundary-baseline.json");

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:[\w*{}\s,]+)\s+from\s+|export\s+[\w*{}\s,]+\s+from\s+|import\s*\(\s*)["']@\/lib\/([^"']+)["']/g;

function toPosixRel(absPath) {
  return path.relative(REPO, absPath).split(path.sep).join("/");
}

function walkTsFiles(dir, out) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

function resolveImportTarget(importPath) {
  const cleaned = importPath.split("?")[0]?.trim() ?? "";
  const domain = cleaned.split("/")[0];
  return domain ?? null;
}

function scanViolations() {
  const files = [];
  walkTsFiles(LIB_ROOT, files);
  const rules = boundaryRules();
  const violations = [];

  for (const absPath of files) {
    const rel = toPosixRel(absPath);
    const fromDomain = libDomain(rel);
    if (!fromDomain) {
      continue;
    }

    const source = fs.readFileSync(absPath, "utf8");
    IMPORT_RE.lastIndex = 0;
    let match;
    while ((match = IMPORT_RE.exec(source)) !== null) {
      const toDomain = resolveImportTarget(match[1] ?? "");
      if (!toDomain || toDomain === fromDomain) {
        continue;
      }
      for (const rule of rules) {
        if (rule.test(fromDomain, toDomain)) {
          violations.push({
            ruleId: rule.id,
            from: rel,
            fromDomain,
            toDomain,
            importPath: `@/lib/${match[1]}`,
            message: rule.message,
          });
        }
      }
    }
  }

  violations.sort((a, b) =>
    `${a.ruleId}:${a.from}:${a.importPath}`.localeCompare(
      `${b.ruleId}:${b.from}:${b.importPath}`,
    ),
  );

  return violations;
}

function violationKey(v) {
  return `${v.ruleId}|${v.from}|${v.importPath}`;
}

const violations = scanViolations();
const keys = violations.map(violationKey);

if (process.argv.includes("--update")) {
  const byRule = {};
  for (const v of violations) {
    byRule[v.ruleId] = (byRule[v.ruleId] ?? 0) + 1;
  }
  fs.writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        violationCount: violations.length,
        byRule,
        keys,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`verify-lib-boundaries: baseline updated → ${violations.length} violations`);
  process.exit(0);
}

if (process.argv.includes("--report")) {
  for (const v of violations) {
    console.log(`${v.ruleId}\t${v.from}\t→ ${v.importPath}`);
  }
  console.log(`\ntotal: ${violations.length}`);
  process.exit(0);
}

let baseline = { violationCount: 0, keys: [] };
try {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
} catch {
  console.error(
    `verify-lib-boundaries: missing ${BASELINE_PATH} — run: node scripts/verify-lib-boundaries.mjs --update`,
  );
  process.exit(1);
}

const baselineKeySet = new Set(baseline.keys ?? []);
const newViolations = violations.filter((v) => !baselineKeySet.has(violationKey(v)));

if (violations.length > baseline.violationCount || newViolations.length > 0) {
  console.error(
    `verify-lib-boundaries: FAIL ${violations.length} violations (baseline ${baseline.violationCount}); ${newViolations.length} new`,
  );
  for (const v of newViolations.slice(0, 30)) {
    console.error(`  [${v.ruleId}] ${v.from} → ${v.importPath}`);
  }
  if (newViolations.length > 30) {
    console.error(`  ... and ${newViolations.length - 30} more new`);
  }
  console.error("\nFix imports or run --update after team review (do not silently grow debt).");
  process.exit(1);
}

console.log(
  `verify-lib-boundaries: ok (${violations.length}/${baseline.violationCount} at baseline; 0 new)`,
);
