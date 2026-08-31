import type { BrowserRuntime, ElementBox } from "../types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class SimulatedBrowserRuntime implements BrowserRuntime {
  private currentUrl = "";

  async launch(): Promise<void> {
    await sleep(120);
  }

  async navigate(url: string): Promise<void> {
    this.currentUrl = url;
    await sleep(180);
  }

  async click(_selector: string): Promise<void> {
    await sleep(160);
  }

  async type(_selector: string, _text: string): Promise<void> {
    await sleep(220);
  }

  async select(_selector: string, _value: string): Promise<void> {
    await sleep(160);
  }

  async scroll(_selector: string): Promise<void> {
    await sleep(120);
  }

  async waitForSelector(_selector: string): Promise<void> {
    await sleep(120);
  }

  async wait(ms: number): Promise<void> {
    await sleep(ms);
  }

  async extractText(selector: string): Promise<string> {
    if (selector.includes("result-count")) {
      return "8";
    }
    return "";
  }

  async extractStructured<T>(_selector: string, _script: string): Promise<T> {
    return [] as T;
  }

  async count(selector: string): Promise<number> {
    if (selector.includes("hotel-card")) {
      return 8;
    }
    if (selector.includes("product-card")) {
      return 0;
    }
    return 0;
  }

  async getElementBox(_selector: string): Promise<ElementBox | null> {
    return { x: 200, y: 180, width: 320, height: 40 };
  }

  async dismissBlockingOverlays(): Promise<void> {
    await sleep(20);
  }

  async screenshot(): Promise<Buffer> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="64" y="120" font-family="system-ui,sans-serif" font-size="32" fill="#1d1d1f">Rimvio Sandbox</text>
      <text x="64" y="170" font-family="system-ui,sans-serif" font-size="18" fill="#86868b">${this.currentUrl || "simulated"}</text>
      <rect x="64" y="220" width="1152" height="420" rx="16" fill="#f5f5f7" stroke="#e5e5ea"/>
      <text x="96" y="280" font-family="system-ui,sans-serif" font-size="16" fill="#636366">Simulated browser · install Playwright for live Chromium</text>
    </svg>`;
    return Buffer.from(svg);
  }

  async close(): Promise<void> {
    await sleep(40);
  }
}
