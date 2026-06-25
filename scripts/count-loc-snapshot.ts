#!/usr/bin/env npx tsx
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PATTERNS = [
  /^(app|components|hooks|lib|scripts|types)\/.*\.(ts|tsx)$/,
  /^middleware\.ts$/,
];

const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
  .split(/\r?\n/)
  .filter((f) => PATTERNS.some((re) => re.test(f)));

let lines = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  lines += fs.readFileSync(abs, "utf8").split("\n").length;
}

console.log(`files=${files.length}`);
console.log(`lines=${lines}`);
