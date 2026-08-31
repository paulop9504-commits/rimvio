import type { BrowserRuntime, ElementBox, ExecutionContext } from "../types";
import { SandboxCancelledError } from "../errors";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const VIEWPORT = { width: 1280, height: 800 };

export function toScreenshotDataUrl(buffer: Buffer): string {
  const head = buffer.subarray(0, 16).toString("utf8");
  if (head.includes("svg") || head.startsWith("<")) {
    return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
  }
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

export function cursorFromBox(box: ElementBox): { x: number; y: number } {
  return {
    x: ((box.x + box.width / 2) / VIEWPORT.width) * 100,
    y: ((box.y + box.height / 2) / VIEWPORT.height) * 100,
  };
}

export async function captureStepScreenshot(
  browser: BrowserRuntime,
  context: ExecutionContext,
  step: string,
): Promise<void> {
  const buffer = await browser.screenshot();
  context.setScreenshot(toScreenshotDataUrl(buffer), step);
}

export async function pause(ms: number, context?: ExecutionContext): Promise<void> {
  if (context?.isCancelled()) {
    throw new SandboxCancelledError();
  }
  await sleep(ms);
  if (context?.isCancelled()) {
    throw new SandboxCancelledError();
  }
}

export async function assertNotCancelled(context: ExecutionContext): Promise<void> {
  if (context.isCancelled()) {
    throw new SandboxCancelledError();
  }
}

export async function highlightElement(
  browser: BrowserRuntime,
  context: ExecutionContext,
  selector: string,
  label: string,
): Promise<void> {
  const box = await browser.getElementBox(selector);
  if (box) {
    const cursor = cursorFromBox(box);
    context.setAgentCursor({ ...cursor, visible: true, label, targetSelector: selector });
  }
}
