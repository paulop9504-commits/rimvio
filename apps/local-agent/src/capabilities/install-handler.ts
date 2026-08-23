import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { InstallJob } from "../execution/types.js";
import { getCapabilitySpec } from "./catalog.js";
import { log, logError } from "../logger.js";

const exec = promisify(execFile);

const AGENT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODULES_DIR = path.join(AGENT_ROOT, "capability-modules");

async function reportProgress(
  jobId: string,
  progressPct: number,
  reporter?: (jobId: string, progressPct: number) => Promise<void>,
): Promise<void> {
  if (reporter) {
    await reporter(jobId, progressPct);
  }
}

async function installBundled(capabilityId: string): Promise<void> {
  log("CAPABILITY", `Installing bundled module ${capabilityId}...`);
  await new Promise((r) => setTimeout(r, 600));
}

async function installNpmModule(
  npmPackage: string,
  onProgress?: (pct: number) => Promise<void>,
): Promise<void> {
  await mkdir(MODULES_DIR, { recursive: true });
  log("CAPABILITY", `Installing npm package ${npmPackage}...`);
  await onProgress?.(20);

  await exec(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", npmPackage, "--no-save", "--prefix", MODULES_DIR],
    { cwd: AGENT_ROOT, timeout: 120_000 },
  );

  await onProgress?.(80);

  const installedPath = path.join(MODULES_DIR, "node_modules", npmPackage);
  await access(installedPath);

  await onProgress?.(100);
  log("CAPABILITY", `npm module ${npmPackage} ready`);
}

async function installBrowserExtension(capabilityId: string): Promise<void> {
  throw new Error(`browser_extension_not_supported:${capabilityId}`);
}

export async function installCapabilityModule(
  capabilityId: string,
  jobId: string,
  reporter?: (jobId: string, progressPct: number) => Promise<void>,
): Promise<void> {
  const spec = getCapabilitySpec(capabilityId);
  if (!spec) {
    throw new Error(`unknown_capability:${capabilityId}`);
  }

  await reportProgress(jobId, 5, reporter);

  switch (spec.installKind) {
    case "bundled":
      await installBundled(capabilityId);
      await reportProgress(jobId, 100, reporter);
      break;
    case "npm_module":
      if (!spec.npmPackage) {
        throw new Error(`missing_npm_package:${capabilityId}`);
      }
      await installNpmModule(spec.npmPackage, (pct) => reportProgress(jobId, pct, reporter));
      break;
    case "browser_extension":
      await installBrowserExtension(capabilityId);
      break;
    default:
      throw new Error(`unsupported_install_kind:${capabilityId}`);
  }

  log("CAPABILITY", `Installed ${capabilityId}`);
}

export async function runInstallJobs(
  jobs: InstallJob[],
  onComplete: (jobId: string) => Promise<void>,
  onFail: (jobId: string, error: string) => Promise<void>,
  onProgress?: (jobId: string, progressPct: number) => Promise<void>,
): Promise<string[]> {
  const installed: string[] = [];
  for (const job of jobs) {
    try {
      await installCapabilityModule(job.capability_id, job.id, onProgress);
      await onComplete(job.id);
      installed.push(job.capability_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "install_failed";
      logError("CAPABILITY", `Install failed ${job.capability_id}`, err);
      await onFail(job.id, msg);
    }
  }
  return installed;
}
