/**
 * Real repo workspace — clone + file ops on disk.
 * GitHub tokens never leave this module (ADR-069).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

const BLOCKED_PATH = [
  /^\.env/i,
  /secret/i,
  /credential/i,
  /id_rsa/i,
  /\.pem$/i,
  /node_modules\//i,
  /^\.git\//i,
];

const ALLOWED_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|scss|html|yml|yaml|toml|sql)$/i;
const MAX_WRITE_BYTES = 200_000;
const MAX_WALK_FILES = 800;

export type RepoCloneResult = {
  readonly ok: boolean;
  readonly root: string | null;
  readonly remoteUrl: string | null;
  readonly error?: string;
  readonly alreadyCloned?: boolean;
};

export type RepoFileHit = {
  readonly path: string;
  readonly line?: number;
  readonly snippet?: string;
};

export function hubRepoRoot(platformId: string): string {
  const safe = platformId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "dev";
  return join(tmpdir(), "rimvio-hub-repos", safe);
}

export function parseGitHubRepoFromUtterance(utterance: string): {
  readonly owner: string;
  readonly repo: string;
  readonly httpsUrl: string;
} | null {
  const url = utterance.match(/github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?\s]|$)/i);
  if (url) {
    const owner = url[1]!;
    const repo = url[2]!;
    return { owner, repo, httpsUrl: `https://github.com/${owner}/${repo}.git` };
  }
  const shorthand = utterance.match(/\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\b/);
  if (shorthand && /clone|클론|레포|checkout|가져와/i.test(utterance)) {
    const owner = shorthand[1]!;
    const repo = shorthand[2]!;
    if (owner === "http" || owner === "https") return null;
    return { owner, repo, httpsUrl: `https://github.com/${owner}/${repo}.git` };
  }
  return null;
}

export { wantsRepoClone } from "@/lib/hub/dev/coding-agent/repo-intent";

export function sanitizeRepoError(message: string): string {
  return message
    .replace(/x-access-token:[^@\s]+@/gi, "x-access-token:***@")
    .replace(/bearer\s+[a-z0-9._-]+/gi, "bearer ***")
    .replace(/ghp_[a-zA-Z0-9]+/g, "ghp_***")
    .slice(0, 240);
}

export function isRepoRelPathAllowed(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.includes("..")) return false;
  if (BLOCKED_PATH.some((p) => p.test(normalized))) return false;
  if (normalized.startsWith(".git/") || normalized === ".git") return false;
  return ALLOWED_EXT.test(normalized) || /^(src|lib|app|components|scripts|tests|supabase|docs)\//.test(normalized);
}

export function resolveRepoPath(root: string, relPath: string): string | null {
  if (!isRepoRelPathAllowed(relPath)) return null;
  const abs = resolve(root, relPath);
  const rel = relative(resolve(root), abs);
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) return null;
  return abs;
}

function toRel(root: string, abs: string): string {
  return relative(root, abs).replace(/\\/g, "/");
}

function walkFiles(root: string, dir: string, acc: string[]): void {
  if (acc.length >= MAX_WALK_FILES) return;
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git" || name === ".next" || name === "dist") continue;
    const abs = join(dir, name);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkFiles(root, abs, acc);
      continue;
    }
    const rel = toRel(root, abs);
    if (isRepoRelPathAllowed(rel)) acc.push(rel);
    if (acc.length >= MAX_WALK_FILES) return;
  }
}

export function listRepoFiles(root: string, query?: string): readonly string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  walkFiles(root, root, files);
  const q = query?.trim().toLowerCase();
  if (!q) return files;
  return files.filter((f) => f.toLowerCase().includes(q));
}

export function readRepoFile(root: string, relPath: string): { path: string; content: string } | null {
  const abs = resolveRepoPath(root, relPath);
  if (!abs || !existsSync(abs)) return null;
  const content = readFileSync(abs, "utf8");
  return { path: relPath.replace(/\\/g, "/"), content };
}

export function writeRepoFile(input: {
  readonly root: string;
  readonly path: string;
  readonly content: string;
}): { path: string; created: boolean; bytes: number } | { error: string } {
  if (Buffer.byteLength(input.content, "utf8") > MAX_WRITE_BYTES) {
    return { error: "file too large" };
  }
  const abs = resolveRepoPath(input.root, input.path);
  if (!abs) return { error: "path not allowed" };
  const created = !existsSync(abs);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, input.content, "utf8");
  return { path: input.path.replace(/\\/g, "/"), created, bytes: Buffer.byteLength(input.content, "utf8") };
}

export function deleteRepoFile(root: string, relPath: string): { path: string; deleted: boolean } | { error: string } {
  const abs = resolveRepoPath(root, relPath);
  if (!abs) return { error: "path not allowed" };
  if (!existsSync(abs)) return { path: relPath, deleted: false };
  rmSync(abs);
  return { path: relPath.replace(/\\/g, "/"), deleted: true };
}

export function searchRepoContent(input: {
  readonly root: string;
  readonly query: string;
  readonly maxHits?: number;
}): readonly RepoFileHit[] {
  const q = input.query.trim();
  if (!q) return [];
  const max = input.maxHits ?? 40;
  const hits: RepoFileHit[] = [];
  for (const path of listRepoFiles(input.root)) {
    const file = readRepoFile(input.root, path);
    if (!file) continue;
    const lines = file.content.split("\n");
    lines.forEach((line, i) => {
      if (hits.length >= max) return;
      if (line.toLowerCase().includes(q.toLowerCase())) {
        hits.push({ path, line: i + 1, snippet: line.trim().slice(0, 160) });
      }
    });
    if (hits.length >= max) break;
  }
  return hits;
}

export function searchRepoSymbols(input: {
  readonly root: string;
  readonly symbol: string;
}): readonly RepoFileHit[] {
  const symbol = input.symbol.trim();
  if (!symbol) return [];
  const def = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?(?:function|class|const|type|interface)\\s+${escapeReg(symbol)}\\b`,
  );
  return searchRepoContent({ root: input.root, query: symbol }).filter((h) =>
    h.snippet ? def.test(h.snippet) || h.snippet.includes(symbol) : false,
  );
}

export function findRepoDefinition(input: {
  readonly root: string;
  readonly symbol: string;
}): RepoFileHit | null {
  const hits = searchRepoSymbols(input);
  const exact = hits.find((h) =>
    h.snippet
      ? new RegExp(`(?:function|class|const|type|interface)\\s+${escapeReg(input.symbol)}\\b`).test(h.snippet)
      : false,
  );
  return exact ?? hits[0] ?? null;
}

export function analyzeRepoImports(input: {
  readonly root: string;
  readonly path: string;
}): readonly string[] {
  const file = readRepoFile(input.root, input.path);
  if (!file) return [];
  const imports: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null = re.exec(file.content);
  while (match) {
    imports.push(match[1]!);
    match = re.exec(file.content);
  }
  return [...new Set(imports)];
}

export function analyzeRepoCallGraph(input: {
  readonly root: string;
  readonly symbol: string;
}): readonly RepoFileHit[] {
  return searchRepoContent({ root: input.root, query: `${input.symbol}(` , maxHits: 30 });
}

export function transformRepoFile(input: {
  readonly root: string;
  readonly path: string;
  readonly find: string;
  readonly replace: string;
}): { path: string; changed: boolean } | { error: string } {
  const file = readRepoFile(input.root, input.path);
  if (!file) return { error: "file not found" };
  if (!input.find) return { error: "find required" };
  const next = file.content.split(input.find).join(input.replace);
  if (next === file.content) return { path: input.path, changed: false };
  const written = writeRepoFile({ root: input.root, path: input.path, content: next });
  if ("error" in written) return written;
  return { path: input.path, changed: true };
}

export async function cloneGitHubRepo(input: {
  readonly platformId: string;
  readonly httpsUrl: string;
  readonly accessToken?: string | null;
  readonly destRoot?: string;
}): Promise<RepoCloneResult> {
  const root = input.destRoot ?? hubRepoRoot(input.platformId);
  if (existsSync(join(root, ".git"))) {
    return { ok: true, root, remoteUrl: input.httpsUrl, alreadyCloned: true };
  }

  mkdirSync(dirname(root), { recursive: true });
  if (existsSync(root)) {
    rmSync(root, { recursive: true, force: true });
  }

  const args = ["clone", "--depth", "1", input.httpsUrl, root];
  const env = { ...process.env };
  if (input.accessToken) {
    args.unshift("-c", `http.extraheader=AUTHORIZATION: bearer ${input.accessToken}`);
  }

  try {
    await execFileAsync("git", args, {
      timeout: 120_000,
      env,
      windowsHide: true,
    });
    return { ok: true, root, remoteUrl: input.httpsUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "clone failed";
    return { ok: false, root: null, remoteUrl: null, error: sanitizeRepoError(message) };
  }
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
