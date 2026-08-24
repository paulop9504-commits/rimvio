export const BROWSER_CAPABILITY_ACTIONS = [
  "browser.open",
  "browser.click",
  "browser.type",
  "browser.read",
  "browser.screenshot",
  "browser.wait",
  "browser.back",
] as const;

export type BrowserCapabilityAction = (typeof BROWSER_CAPABILITY_ACTIONS)[number];

const ALLOWED = new Set<string>(BROWSER_CAPABILITY_ACTIONS);

const FORBIDDEN_PREFIXES = [
  "os.",
  "shell.",
  "process.",
  "fs.",
  "system.",
  "cmd.",
] as const;

export function isAllowedBrowserCapability(type: string): boolean {
  return ALLOWED.has(type.trim());
}

export function isForbiddenOsCapability(type: string): boolean {
  const id = type.trim().toLowerCase();
  if (ALLOWED.has(id)) {
    return false;
  }
  return FORBIDDEN_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function assertAllowedBrowserCapability(type: string): void {
  const id = type.trim();
  if (isForbiddenOsCapability(id) || !isAllowedBrowserCapability(id)) {
    throw new Error(`capability_denied:${id || "empty"}`);
  }
}

export type BrowserAction = {
  type: BrowserCapabilityAction;
  target?: string;
  value?: string;
  timeoutMs?: number;
};

export function parseBrowserAction(raw: unknown): BrowserAction | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const rec = raw as { type?: unknown; target?: unknown; value?: unknown; timeoutMs?: unknown };
  if (typeof rec.type !== "string" || !isAllowedBrowserCapability(rec.type)) {
    return null;
  }
  return {
    type: rec.type as BrowserCapabilityAction,
    ...(typeof rec.target === "string" ? { target: rec.target } : {}),
    ...(typeof rec.value === "string" ? { value: rec.value } : {}),
    ...(typeof rec.timeoutMs === "number" ? { timeoutMs: rec.timeoutMs } : {}),
  };
}
