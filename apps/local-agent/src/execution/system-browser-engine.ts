import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import {
  chromeExecutableCandidates,
} from "../../../../lib/pc-local-agent/host-chrome.ts";
import { isPcAgentCheckoutUrl } from "../../../../lib/pc-local-agent/purchase-intent.ts";
import { isPcAgentNavigableUrl } from "../../../../lib/pc-local-agent/url-safety.ts";
import { ensureChromeForShopRun } from "./ensure-chrome.js";
import { log } from "../logger.js";
import type { AgentTask, ExecutionEngine, ExecutionResult, ProgressReporter } from "./types.js";

const execFileAsync = promisify(execFile);

function spawnDetached(file: string, args: string[]): void {
  const child = spawn(file, args, { detached: true, stdio: "ignore" });
  child.unref();
}

async function openWindowsBrowser(url: string): Promise<void> {
  const chrome = chromeExecutableCandidates().find((path) => existsSync(path));
  if (chrome) {
    spawnDetached(chrome, [url]);
    return;
  }
  await execFileAsync("cmd.exe", ["/c", "start", "", url], {
    windowsHide: true,
    timeout: 15_000,
  });
}

export async function openSystemBrowser(url: string): Promise<void> {
  if (process.platform === "win32") {
    await openWindowsBrowser(url);
    return;
  }
  if (process.platform === "darwin") {
    await execFileAsync("open", [url], { timeout: 15_000 });
    return;
  }
  await execFileAsync("xdg-open", [url], { timeout: 15_000 });
}

/** Packaged Rimvio PC — open the real browser without Playwright. */
export class SystemBrowserEngine implements ExecutionEngine {
  async execute(task: AgentTask, report?: ProgressReporter): Promise<ExecutionResult> {
    const url = task.payload.url?.trim();
    if (!url) {
      throw new Error("missing_url");
    }
    if (!isPcAgentNavigableUrl(url) || isPcAgentCheckoutUrl(url)) {
      throw new Error("checkout_blocked");
    }
    const shop = task.payload.intent === "purchase";
    if (shop) {
      await ensureChromeForShopRun(report);
    }
    log("BROWSER", `Opening system browser ${url}`);
    await openSystemBrowser(url);
    await report?.({ phase: "BROWSER_OPENED", url, graphNode: shop ? "FIND_PRODUCT" : undefined });
    await report?.({ phase: "PAGE_READY", url, graphNode: shop ? "SELECT_PRODUCT" : undefined });
    if (shop) {
      await report?.({
        phase: "ACTION_RUNNING",
        url,
        graphNode: "REVIEW_ORDER",
        message: "browser_left_open",
      });
      return {
        success: true,
        url,
        message: "browser_left_open",
        hold: "waiting_user",
      };
    }
    return { success: true, url, message: "browser_left_open", hold: "none" };
  }
}
