import type { BrowserRuntime } from "../types";

export class PlaywrightBrowserRuntime implements BrowserRuntime {
  private browser: import("playwright").Browser | null = null;
  private context: import("playwright").BrowserContext | null = null;
  private page: import("playwright").Page | null = null;

  async launch(): Promise<void> {
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "ko-KR",
      javaScriptEnabled: true,
    });
    await this.context.addInitScript(() => {
      localStorage.setItem("rimvio.locale-setup.v1", "done");
      localStorage.setItem("rimvio.locale.v1", "ko");
      localStorage.setItem("rimvio.home-country.v1", "KR");
    });
    this.page = await this.context.newPage();
  }

  private requirePage() {
    if (!this.page) {
      throw new Error("browser_not_launched");
    }
    return this.page;
  }

  async navigate(url: string): Promise<void> {
    await this.requirePage().goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await this.dismissBlockingOverlays();
  }

  async click(selector: string): Promise<void> {
    await this.requirePage().click(selector, { timeout: 10_000 });
  }

  async type(selector: string, text: string): Promise<void> {
    await this.requirePage().locator(selector).fill(text, { timeout: 10_000 });
  }

  async select(selector: string, value: string): Promise<void> {
    await this.requirePage().selectOption(selector, value, { timeout: 10_000 });
  }

  async scroll(selector: string): Promise<void> {
    await this.requirePage().locator(selector).scrollIntoViewIfNeeded({ timeout: 10_000 });
  }

  async waitForSelector(selector: string): Promise<void> {
    await this.requirePage().waitForSelector(selector, { timeout: 15_000 });
  }

  async wait(ms: number): Promise<void> {
    await this.requirePage().waitForTimeout(ms);
  }

  async extractText(selector: string): Promise<string> {
    return (await this.requirePage().textContent(selector)) ?? "";
  }

  async extractStructured<T>(selector: string, script: string): Promise<T> {
    const page = this.requirePage();
    return page.evaluate(
      ({ sel, body }) => {
        const elements = Array.from(document.querySelectorAll(sel));
        const fn = new Function("elements", body) as (elements: Element[]) => T;
        return fn(elements);
      },
      { sel: selector, body: script },
    ) as Promise<T>;
  }

  async count(selector: string): Promise<number> {
    return this.requirePage().locator(selector).count();
  }

  async getElementBox(selector: string): Promise<import("../types").ElementBox | null> {
    const box = await this.requirePage().locator(selector).boundingBox();
    if (!box) {
      return null;
    }
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }

  async dismissBlockingOverlays(): Promise<void> {
    const page = this.requirePage();
    const dialog = page.locator('[aria-labelledby="rimvio-locale-welcome-title"]');
    if ((await dialog.count()) === 0) {
      return;
    }
    const continueButton = dialog.locator("button").first();
    try {
      await continueButton.click({ timeout: 5000 });
      await page.waitForTimeout(250);
    } catch {
      /* overlay may already be gone */
    }
  }

  async screenshot(): Promise<Buffer> {
    return this.requirePage().screenshot({ type: "jpeg", quality: 72, fullPage: false });
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
    } else if (this.browser) {
      await this.browser.close();
    }
    this.browser = null;
    this.context = null;
    this.page = null;
  }
}

export async function isPlaywrightAvailable(): Promise<boolean> {
  if (process.env.SANDBOX_PLAYWRIGHT === "0") {
    return false;
  }
  try {
    const { existsSync } = await import("node:fs");
    const { chromium } = await import("playwright");
    const executable = chromium.executablePath();
    return existsSync(executable);
  } catch {
    return false;
  }
}

export async function createBrowserRuntime(options?: {
  requireReal?: boolean;
}): Promise<BrowserRuntime> {
  if (await isPlaywrightAvailable()) {
    return new PlaywrightBrowserRuntime();
  }
  if (options?.requireReal) {
    throw new Error("PLAYWRIGHT_REQUIRED");
  }
  const { SimulatedBrowserRuntime } = await import("./simulated-runtime");
  return new SimulatedBrowserRuntime();
}
