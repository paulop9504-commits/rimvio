import { chromium, type Browser, type BrowserContext } from "playwright";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { log } from "../logger.js";

const DEFAULT_CDP = "http://127.0.0.1:9222";

export type ChromeSession = {
  context: BrowserContext;
  attached: boolean;
  browser?: Browser;
};

function rimvioProfileDir(): string {
  const override = process.env.RIMVIO_BROWSER_PROFILE?.trim();
  return override || join(homedir(), ".rimvio", "pc-agent-profile");
}

async function connectCdp(): Promise<ChromeSession | null> {
  const url = process.env.RIMVIO_CHROME_CDP_URL?.trim() || DEFAULT_CDP;
  try {
    const browser = await Promise.race([
      chromium.connectOverCDP(url),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("cdp_timeout")), 2_500);
      }),
    ]);
    const context = browser.contexts()[0];
    if (!context) {
      await browser.close().catch(() => undefined);
      return null;
    }
    log("BROWSER", `Attached to Chrome via CDP ${url}`);
    return { context, attached: true, browser };
  } catch {
    return null;
  }
}

async function launchChromeProfile(): Promise<ChromeSession> {
  const dir = rimvioProfileDir();
  mkdirSync(dir, { recursive: true });
  const common = {
    headless: false,
    viewport: { width: 1280, height: 900 } as const,
    locale: "ko-KR",
    args: ["--disable-blink-features=AutomationControlled"],
  };
  try {
    log("BROWSER", `Launching Chrome profile ${dir}`);
    const context = await chromium.launchPersistentContext(dir, {
      ...common,
      channel: "chrome",
    });
    return { context, attached: false };
  } catch (err) {
    log(
      "BROWSER",
      `Chrome channel failed (${err instanceof Error ? err.message : "error"}) — Chromium`,
    );
    const context = await chromium.launchPersistentContext(dir, common);
    return { context, attached: false };
  }
}

export async function openChromeSession(): Promise<ChromeSession> {
  const attached = await connectCdp();
  if (attached) {
    return attached;
  }
  log(
    "BROWSER",
    "No Chrome CDP. To reuse the Chrome you already logged into, close extra windows then start Chrome with --remote-debugging-port=9222 (or set RIMVIO_CHROME_CDP_URL).",
  );
  return launchChromeProfile();
}
