import { chromium } from "playwright";
import type { AgentTask, ExecutionEngine, ExecutionResult } from "./types.js";
import { log } from "../logger.js";

export class BrowserExecutionEngine implements ExecutionEngine {
  async execute(task: AgentTask): Promise<ExecutionResult> {
    const url = task.payload.url?.trim();
    if (!url) {
      throw new Error("missing_url");
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("invalid_url");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid_url_protocol");
    }

    log("BROWSER", "Launching browser");
    const browser = await chromium.launch({ headless: false });
    try {
      const page = await browser.newPage();
      log("BROWSER", `Navigating to ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      return { success: true, url };
    } finally {
      await browser.close();
    }
  }
}
