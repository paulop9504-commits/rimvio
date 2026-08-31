/**
 * Repo verify — discover/generate tests, unit/e2e, lint, typecheck.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listRepoFiles, readRepoFile, writeRepoFile } from "@/lib/hub/dev/coding-agent/repo-workspace";
import type { VerifyCommandResult, VerifyKind } from "@/lib/hub/dev/coding-agent/verify-types";

export type { VerifyCommandResult, VerifyKind } from "@/lib/hub/dev/coding-agent/verify-types";
export { parseVerifyFailures } from "@/lib/hub/dev/coding-agent/verify-types";

const execFileAsync = promisify(execFile);

export type TestDiscovery = {
  readonly files: readonly string[];
  readonly related: readonly string[];
};

export function discoverRepoTests(input: {
  readonly root: string;
  readonly query?: string;
}): TestDiscovery {
  const files = listRepoFiles(input.root).filter((p) =>
    /\.(test|spec)\.(ts|tsx|js|mjs)$/i.test(p) || /(?:^|\/)(?:scripts\/test-|tests\/)/i.test(p),
  );
  const q = input.query?.trim().toLowerCase();
  const related = q
    ? files.filter((p) => p.toLowerCase().includes(q) || basenameNoExt(p).includes(q))
    : files;
  return { files, related };
}

function basenameNoExt(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.(test|spec)\.[^.]+$/i, "").toLowerCase();
}

export function generateRepoTestFile(input: {
  readonly root: string;
  readonly targetPath?: string;
  readonly symbol?: string;
  readonly capability?: string;
}): { path: string; created: boolean; content: string } | { error: string } {
  const stem =
    input.symbol?.replace(/[^a-zA-Z0-9_-]/g, "") ||
    input.capability?.replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\./g, "-") ||
    (input.targetPath ? basenameNoExt(input.targetPath) : "generated");
  const rel = `scripts/test-${stem.toLowerCase()}.ts`;
  const existing = readRepoFile(input.root, rel);
  if (existing) {
    return { path: rel, created: false, content: existing.content };
  }

  const target = input.targetPath ?? input.capability ?? input.symbol ?? "module";
  const content = [
    `/** Generated Operator test for ${target} */`,
    `import assert from "node:assert/strict";`,
    ``,
    `async function main() {`,
    `  assert.ok(true, "${stem} scaffold");`,
    `}`,
    ``,
    `main().catch((err) => {`,
    `  console.error(err);`,
    `  process.exit(1);`,
    `});`,
    ``,
  ].join("\n");

  const written = writeRepoFile({ root: input.root, path: rel, content });
  if ("error" in written) return written;
  return { path: rel, created: written.created, content };
}

function readPackageScripts(root: string): Record<string, string> {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

function npmCmd(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npxCmd(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

async function runCommand(input: {
  readonly root: string;
  readonly file: string;
  readonly args: readonly string[];
  readonly kind: VerifyKind;
  readonly commandLabel: string;
  readonly timeoutMs?: number;
}): Promise<VerifyCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(input.file, [...input.args], {
      cwd: input.root,
      timeout: input.timeoutMs ?? 90_000,
      windowsHide: true,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
    });
    return {
      kind: input.kind,
      ok: true,
      command: input.commandLabel,
      exitCode: 0,
      stdout: String(stdout).slice(0, 4000),
      stderr: String(stderr).slice(0, 2000),
    };
  } catch (err) {
    const execErr = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    return {
      kind: input.kind,
      ok: false,
      command: input.commandLabel,
      exitCode: typeof execErr.code === "number" ? execErr.code : 1,
      stdout: String(execErr.stdout ?? "").slice(0, 4000),
      stderr: String(execErr.stderr ?? execErr.message ?? "command failed").slice(0, 2000),
    };
  }
}

export async function runRepoUnitTests(root: string): Promise<VerifyCommandResult> {
  const scripts = readPackageScripts(root);
  if (scripts.test) {
    return runCommand({
      root,
      file: npmCmd(),
      args: ["test", "--silent"],
      kind: "unit",
      commandLabel: "npm test",
    });
  }
  return {
    kind: "unit",
    ok: false,
    command: "npm test",
    exitCode: 1,
    stdout: "",
    stderr: "",
    skipped: true,
    skipReason: "no test script",
  };
}

export async function runRepoIntegrationTests(root: string): Promise<VerifyCommandResult> {
  const scripts = readPackageScripts(root);
  const name = scripts["test:integration"] ? "test:integration" : scripts["test:int"] ? "test:int" : null;
  if (!name) {
    return {
      kind: "integration",
      ok: true,
      command: "npm run test:integration",
      exitCode: 0,
      stdout: "",
      stderr: "",
      skipped: true,
      skipReason: "no integration script",
    };
  }
  return runCommand({
    root,
    file: npmCmd(),
    args: ["run", name],
    kind: "integration",
    commandLabel: `npm run ${name}`,
  });
}

export async function runRepoE2E(root: string): Promise<VerifyCommandResult> {
  const scripts = readPackageScripts(root);
  if (scripts["test:e2e"]) {
    return runCommand({
      root,
      file: npmCmd(),
      args: ["run", "test:e2e"],
      kind: "e2e",
      commandLabel: "npm run test:e2e",
      timeoutMs: 180_000,
    });
  }
  const pkgPath = join(root, "package.json");
  let hasPlaywright = false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    hasPlaywright = Boolean(pkg.devDependencies?.["@playwright/test"] || pkg.dependencies?.["@playwright/test"]);
  } catch {
    hasPlaywright = false;
  }
  if (hasPlaywright) {
    return runCommand({
      root,
      file: npxCmd(),
      args: ["playwright", "test"],
      kind: "e2e",
      commandLabel: "npx playwright test",
      timeoutMs: 180_000,
    });
  }
  return {
    kind: "e2e",
    ok: true,
    command: "e2e",
    exitCode: 0,
    stdout: "",
    stderr: "",
    skipped: true,
    skipReason: "no e2e runner",
  };
}

export async function runRepoLint(root: string): Promise<VerifyCommandResult> {
  const scripts = readPackageScripts(root);
  if (scripts.lint) {
    return runCommand({
      root,
      file: npmCmd(),
      args: ["run", "lint"],
      kind: "lint",
      commandLabel: "npm run lint",
    });
  }
  return runCommand({
    root,
    file: npxCmd(),
    args: ["eslint", ".", "--max-warnings", "0"],
    kind: "lint",
    commandLabel: "npx eslint .",
  });
}

export async function runRepoTypecheck(root: string): Promise<VerifyCommandResult> {
  const scripts = readPackageScripts(root);
  if (scripts.typecheck || scripts["type-check"]) {
    const name = scripts.typecheck ? "typecheck" : "type-check";
    return runCommand({
      root,
      file: npmCmd(),
      args: ["run", name],
      kind: "typecheck",
      commandLabel: `npm run ${name}`,
    });
  }
  return runCommand({
    root,
    file: npxCmd(),
    args: ["tsc", "--noEmit", "--pretty", "false"],
    kind: "typecheck",
    commandLabel: "npx tsc --noEmit",
  });
}

export async function runRepoBuild(root: string): Promise<VerifyCommandResult> {
  const scripts = readPackageScripts(root);
  if (!scripts.build) {
    return {
      kind: "build",
      ok: true,
      command: "npm run build",
      exitCode: 0,
      stdout: "",
      stderr: "",
      skipped: true,
      skipReason: "no build script",
    };
  }
  return runCommand({
    root,
    file: npmCmd(),
    args: ["run", "build"],
    kind: "build",
    commandLabel: "npm run build",
    timeoutMs: 180_000,
  });
}

