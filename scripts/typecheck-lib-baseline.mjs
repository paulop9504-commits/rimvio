#!/usr/bin/env node
/**
 * Fails when lib/test TS error count exceeds the checked-in baseline.
 * Run `node scripts/typecheck-lib-baseline.mjs --update` after intentional debt reduction.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASELINE_PATH = path.join(import.meta.dirname, "typecheck-lib-baseline.json");
const shippingRe = /^(app|components|hooks)[/\\]/;

const result = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], {
  encoding: "utf8",
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const lines = output.split(/\r?\n/).filter((line) => line.includes("error TS"));
const libLines = lines.filter((line) => !shippingRe.test(line.split("(")[0] ?? ""));
const libCount = libLines.length;

if (process.argv.includes("--update")) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ libErrorCount: libCount, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  console.log(`typecheck-lib-baseline: updated → ${libCount}`);
  process.exit(0);
}

let baseline = { libErrorCount: 0 };
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch {
  console.error(`typecheck-lib-baseline: missing ${BASELINE_PATH} — run with --update`);
  process.exit(1);
}

if (libCount > baseline.libErrorCount) {
  console.error(
    `typecheck-lib-baseline: FAIL lib errors ${libCount} > baseline ${baseline.libErrorCount}`,
  );
  console.error(libLines.slice(0, 20).join("\n"));
  if (libLines.length > 20) {
    console.error(`... and ${libLines.length - 20} more`);
  }
  process.exit(1);
}

console.log(
  `typecheck-lib-baseline: ok (${libCount}/${baseline.libErrorCount} lib errors; ${lines.length - libCount} shipping excluded)`,
);
process.exit(0);
