import type { BrowserContext, Page } from "playwright";
import type { AgentTask, ExecutionEngine, ExecutionResult, ProgressReporter } from "./types.js";
import { log } from "../logger.js";
import { openChromeSession, type ChromeSession } from "./chrome-session.js";
import { ensureChromeForShopRun } from "./ensure-chrome.js";
import {
  completeCheckoutAfterApproval,
  isPaymentNavigation,
  prepareShopOnPage,
} from "./shop-prepare.js";
import { assertAllowedBrowserCapability } from "../../../lib/pc-local-agent/browser-capabilities.ts";
import { isPcAgentNavigableUrl } from "../../../lib/pc-local-agent/url-safety.ts";
import { captureDesktopJpegBase64 } from "./capture-desktop.js";
import { openPcDesktopApp } from "./open-desktop-target.js";

let session: ChromeSession | null = null;
let sharedPage: Page | null = null;

async function getContext(): Promise<BrowserContext> {
  if (session?.context) {
    return session.context;
  }
  session = await openChromeSession();
  session.context.on("close", () => {
    session = null;
    sharedPage = null;
  });
  if (!session.attached) {
    await session.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
  }
  return session.context;
}

async function getPage(): Promise<Page> {
  const context = await getContext();
  if (sharedPage && !sharedPage.isClosed()) {
    return sharedPage;
  }
  sharedPage = await context.newPage();
  return sharedPage;
}

async function screenshotJpeg(page: Page): Promise<string | undefined> {
  try {
    const buf = await page.screenshot({ type: "jpeg", quality: 42, fullPage: false });
    const b64 = buf.toString("base64");
    return b64.slice(0, 220_000);
  } catch {
    return undefined;
  }
}

async function readProduct(page: Page): Promise<ExecutionResult["product"]> {
  const title = await page.title().catch(() => "");
  const text = await page.locator("body").innerText().catch(() => "");
  const price = text.match(/([\d,]+)\s*원/)?.[1];
  const delivery = /내일|모레|오늘/.test(text) ? "내일" : undefined;
  return {
    title: title.slice(0, 80) || undefined,
    price: price ? `${price}원` : undefined,
    delivery,
  };
}

export class BrowserExecutionEngine implements ExecutionEngine {
  async execute(task: AgentTask, report?: ProgressReporter): Promise<ExecutionResult> {
    if (task.payload.intent === "desktop" && task.payload.appId) {
      await openPcDesktopApp(task.payload.appId);
      await report?.({ phase: "BROWSER_OPENED", message: "desktop_opened" });
      const shot = await captureDesktopJpegBase64();
      await report?.({ phase: "PAGE_READY", screenshotJpeg: shot, message: "desktop_ready" });
      return {
        success: true,
        url: task.payload.url,
        message: "desktop_opened",
        hold: "none",
        screenshotJpeg: shot,
      };
    }
    assertAllowedBrowserCapability("browser.open");
    const url = task.payload.url?.trim();
    if (!url) {
      throw new Error("missing_url");
    }
    if (!isPcAgentNavigableUrl(url) || isPaymentNavigation(url)) {
      throw new Error("checkout_blocked");
    }

    const shop = task.payload.intent === "purchase";
    await ensureChromeForShopRun(report);
    const page = await getPage();
    await report?.({ phase: "BROWSER_OPENED", url, graphNode: "FIND_PRODUCT" });

    if (shop) {
      const result = await prepareShopOnPage(page, {
        url,
        query: task.payload.query,
      });
      log("BROWSER", `${result.message} — ${result.url}`);
      await report?.({ phase: "PAGE_READY", url: result.url, graphNode: "SELECT_PRODUCT" });
      const shot = await screenshotJpeg(page);
      const product = await readProduct(page);
      if (result.message === "awaiting_human_captcha" || result.message === "awaiting_human_auth") {
        await report?.({
          phase: "HUMAN_REQUIRED",
          url: result.url,
          message: result.message,
          screenshotJpeg: shot,
          product,
        });
        return {
          success: false,
          url: result.url,
          message: result.message,
          hold: "human_required",
          screenshotJpeg: shot,
          product,
        };
      }
      await report?.({
        phase: "ACTION_RUNNING",
        url: result.url,
        graphNode: "REVIEW_ORDER",
        screenshotJpeg: shot,
        product,
      });
      return {
        success: true,
        url: result.url,
        message: result.message,
        hold: "waiting_user",
        screenshotJpeg: shot,
        product,
      };
    }

    log("BROWSER", `Navigating to ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    log("BROWSER", "Page open");
    const shot = await screenshotJpeg(page);
    await report?.({ phase: "PAGE_READY", url: page.url(), screenshotJpeg: shot });
    return { success: true, url: page.url(), message: "browser_left_open", hold: "none", screenshotJpeg: shot };
  }

  async checkout(task: AgentTask, report?: ProgressReporter): Promise<ExecutionResult> {
    assertAllowedBrowserCapability("browser.click");
    const page = await getPage();
    await report?.({ phase: "ACTION_RUNNING", url: page.url(), graphNode: "CHECKOUT" });
    const message = await completeCheckoutAfterApproval(page);
    const shot = await screenshotJpeg(page);
    if (message === "awaiting_human_auth") {
      await report?.({
        phase: "HUMAN_REQUIRED",
        url: page.url(),
        message,
        screenshotJpeg: shot,
      });
      return { success: false, url: page.url(), message, hold: "human_required", screenshotJpeg: shot };
    }
    await report?.({
      phase: "VERIFYING",
      url: page.url(),
      message,
      screenshotJpeg: shot,
      graphNode: "VERIFY",
    });
    return { success: true, url: page.url(), message, hold: "none", screenshotJpeg: shot };
  }

  async snapshot(): Promise<string | undefined> {
    const page = await getPage();
    return screenshotJpeg(page);
  }
}
