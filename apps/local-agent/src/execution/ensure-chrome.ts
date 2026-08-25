import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  CHROME_SETUP_FILENAME,
  chromeSetupDownloadUrl,
  isChromeInstalled,
} from "../../../../lib/pc-local-agent/host-chrome.ts";
import { log, logError } from "../logger.js";
import type { ProgressReporter } from "./types.js";

const exec = promisify(execFile);

async function downloadChromeSetup(): Promise<string> {
  const url = chromeSetupDownloadUrl();
  const dest = join(tmpdir(), CHROME_SETUP_FILENAME);
  log("BROWSER", `Fetching Chrome setup ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`chrome_download_${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return dest;
}

async function runChromeSetup(setupPath: string): Promise<void> {
  log("BROWSER", "Installing Chrome for this purchase run");
  await exec(setupPath, ["/silent", "/install"], { timeout: 180_000 });
}

/** If Chrome is missing, install it then continue. Never throw — Chromium can still run. */
export async function ensureChromeForShopRun(report?: ProgressReporter): Promise<void> {
  if (process.platform !== "win32") {
    return;
  }
  if (isChromeInstalled()) {
    return;
  }
  await report?.({
    phase: "RUNNING",
    message: "chrome_installing",
    graphNode: "ENSURE_BROWSER",
  });
  try {
    const setup = await downloadChromeSetup();
    await runChromeSetup(setup);
    log("BROWSER", "Chrome install finished");
  } catch (err) {
    logError("BROWSER", "Chrome install skipped — will use bundled browser", err);
  }
}
