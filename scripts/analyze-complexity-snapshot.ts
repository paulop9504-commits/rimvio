#!/usr/bin/env npx tsx
/**
 * Snapshot cyclomatic complexity (approximate) for tracked TS/TSX files.
 * CC ≈ 1 + decision tokens (if/for/while/switch/case/catch/&&/||/??/? :)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const THRESHOLD = 15;
const TOP_N = 25;

const DECISION_RE =
  /\b(if|else\s+if|for|while|switch|case|catch)\b|&&|\|\||\?\?|\?[^.?]/g;

type FnHit = {
  file: string;
  fn: string;
  line: number;
  cc: number;
  lines: number;
};

function listSourceFiles(): string[] {
  const raw = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
  return raw
    .split(/\r?\n/)
    .filter((f) => /^(lib|components|hooks|app)\/.*\.(ts|tsx)$/.test(f))
    .filter((f) => !f.includes("__pycache__"));
}

function braceBalance(slice: string): number {
  let n = 0;
  for (const ch of slice) {
    if (ch === "{") n++;
    if (ch === "}") n--;
  }
  return n;
}

function extractFunctions(source: string): { name: string; start: number; body: string }[] {
  const fns: { name: string; start: number; body: string }[] = [];
  const fnStart =
    /^(export\s+)?(async\s+)?function\s+([A-Za-z0-9_$]+)/gm;
  const arrowConst =
    /^(export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(async\s+)?\(/gm;

  for (const re of [fnStart, arrowConst]) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(source)) !== null) {
      const name = m[3] ?? m[2] ?? "anonymous";
      const startIdx = m.index;
      const startLine = source.slice(0, startIdx).split("\n").length;
      const rest = source.slice(startIdx);
      let end = rest.indexOf("{");
      if (end < 0) continue;
      let i = end;
      let bal = 0;
      for (; i < rest.length; i++) {
        if (rest[i] === "{") bal++;
        if (rest[i] === "}") {
          bal--;
          if (bal === 0) {
            i++;
            break;
          }
        }
      }
      const body = rest.slice(0, i);
      fns.push({ name, start: startLine, body });
    }
  }
  return fns;
}

function approxCc(body: string): number {
  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const hits = stripped.match(DECISION_RE);
  return 1 + (hits?.length ?? 0);
}

function analyzeFile(rel: string): FnHit[] {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const source = fs.readFileSync(abs, "utf8");
  return extractFunctions(source).map((fn) => ({
    file: rel,
    fn: fn.name,
    line: fn.start,
    cc: approxCc(fn.body),
    lines: fn.body.split("\n").length,
  }));
}

const allHits: FnHit[] = [];
for (const file of listSourceFiles()) {
  allHits.push(...analyzeFile(file));
}

const hot = allHits
  .filter((h) => h.cc >= THRESHOLD)
  .sort((a, b) => b.cc - a.cc || b.lines - a.lines)
  .slice(0, TOP_N);

console.log(`files_scanned=${listSourceFiles().length}`);
console.log(`functions_total=${allHits.length}`);
console.log(`functions_cc_ge_${THRESHOLD}=${allHits.filter((h) => h.cc >= THRESHOLD).length}`);
console.log("\n--- top complexity (approx CC) ---");
for (const h of hot) {
  console.log(`CC~${h.cc}\tL${h.line}\t${h.lines}L\t${h.file} :: ${h.fn}`);
}
