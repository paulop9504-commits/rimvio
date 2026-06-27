#!/usr/bin/env node
/**
 * CI typecheck — shipping surface must be clean; lib debt cannot grow past baseline.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], {
  encoding: "utf8",
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const lines = output.split(/\r?\n/).filter((line) => line.includes("error TS"));

const shippingRe = /^(app|components|hooks)[/\\]/;
const shippingErrors = lines.filter((line) => shippingRe.test(line.split("(")[0] ?? ""));
const libDebt = lines.length - shippingErrors.length;

if (shippingErrors.length > 0) {
  console.error(shippingErrors.join("\n"));
  process.exit(1);
}

const baseline = spawnSync("node", ["scripts/typecheck-lib-baseline.mjs"], {
  encoding: "utf8",
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});
if (baseline.status !== 0) {
  process.stderr.write(baseline.stdout ?? "");
  process.stderr.write(baseline.stderr ?? "");
  process.exit(1);
}
process.stdout.write(baseline.stdout ?? "");

if (lines.length > 0) {
  console.log(`typecheck-ci: ok (shipping clean; ${libDebt} lib debt at/below baseline)`);
} else {
  console.log("typecheck-ci: ok");
}

process.exit(0);
