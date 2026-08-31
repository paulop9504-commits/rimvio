import type { BrowserRuntime } from "./types";

const cancelFlags = new Set<string>();
const activeBrowsers = new Map<string, BrowserRuntime>();
const runningExecutions = new Set<string>();

export function markExecutionRunning(executionId: string): boolean {
  if (runningExecutions.has(executionId)) {
    return false;
  }
  runningExecutions.add(executionId);
  return true;
}

export function markExecutionFinished(executionId: string): void {
  runningExecutions.delete(executionId);
  cancelFlags.delete(executionId);
  activeBrowsers.delete(executionId);
}

export function isExecutionRunning(executionId: string): boolean {
  return runningExecutions.has(executionId);
}

export function requestCancelExecution(executionId: string): void {
  cancelFlags.add(executionId);
}

export function isExecutionCancelled(executionId: string): boolean {
  return cancelFlags.has(executionId);
}

export function registerActiveBrowser(executionId: string, browser: BrowserRuntime): void {
  activeBrowsers.set(executionId, browser);
}

export async function closeActiveBrowser(executionId: string): Promise<void> {
  const browser = activeBrowsers.get(executionId);
  if (!browser) {
    return;
  }
  try {
    await browser.close();
  } catch {
    /* ignore close errors */
  }
  activeBrowsers.delete(executionId);
}

export function getActiveBrowser(executionId: string): BrowserRuntime | undefined {
  return activeBrowsers.get(executionId);
}
