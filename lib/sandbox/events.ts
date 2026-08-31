import type { SandboxEvent, SandboxEventType } from "./types";

let eventSeq = 0;

export function nextEventId(executionId: string): string {
  eventSeq += 1;
  return `${executionId}-evt-${eventSeq}`;
}

export function createSandboxEvent(
  executionId: string,
  type: SandboxEventType,
  data: Record<string, unknown> = {},
  extras: Partial<
    Pick<SandboxEvent, "step" | "action" | "target" | "metadata" | "durationMs" | "status">
  > = {},
): SandboxEvent {
  return {
    id: nextEventId(executionId),
    executionId,
    sessionId: executionId,
    type,
    timestamp: Date.now(),
    step: extras.step ?? (typeof data.step === "string" ? data.step : null),
    action: extras.action ?? (typeof data.action === "string" ? data.action : null),
    target: extras.target ?? (typeof data.target === "string" ? data.target : null),
    metadata: extras.metadata ?? data,
    durationMs: extras.durationMs ?? null,
    status: extras.status ?? "ok",
    data,
  };
}

export function formatEventForConsole(event: SandboxEvent): {
  text: string;
  tone: "default" | "success" | "warn" | "error";
} {
  const label = event.action ?? event.type;
  switch (event.type) {
    case "EXECUTION_STARTED":
      return { text: "Execution started", tone: "default" };
    case "EXECUTION_COMPLETED":
      return { text: String(event.metadata.summary ?? "Execution completed"), tone: "success" };
    case "EXECUTION_FAILED":
      return { text: String(event.metadata.message ?? "Execution failed"), tone: "error" };
    case "EXECUTION_CANCELLED":
      return { text: "Execution cancelled", tone: "warn" };
    case "BROWSER_STARTED":
      return { text: "Browser started · Chromium", tone: "default" };
    case "NAVIGATION_STARTED":
      return { text: `Opening · ${String(event.target ?? event.metadata.url ?? "")}`, tone: "default" };
    case "NAVIGATION_COMPLETED":
      return { text: `Opened · ${String(event.target ?? event.metadata.url ?? "")}`, tone: "success" };
    case "ELEMENT_FOUND":
      return { text: `Found · ${String(event.target ?? "")}`, tone: "default" };
    case "TYPE":
    case "input":
      return { text: `Typing · ${String(event.metadata.text ?? label)}`, tone: "default" };
    case "CLICK":
    case "click":
      return { text: `Click · ${String(event.target ?? label)}`, tone: "default" };
    case "WAIT":
      return { text: `Wait · ${String(event.target ?? label)}`, tone: "default" };
    case "DATA_EXTRACTED":
    case "extract":
      return { text: `Extracted · ${String(event.metadata.summary ?? event.metadata.count ?? "")}`, tone: "success" };
    case "STEP_COMPLETED":
      return { text: `Step completed · ${String(event.step ?? label)}`, tone: "success" };
    case "SCREENSHOT":
    case "screenshot":
      return { text: "Screenshot captured", tone: "default" };
    case "browser.launch":
      return { text: "Started Sandbox · Chromium", tone: "default" };
    case "page.goto":
      return { text: `Opened website · ${String(event.data.url ?? "")}`, tone: "default" };
    case "element.find":
      return { text: `Found element · ${String(event.data.selector ?? "")}`, tone: "default" };
    case "result":
      return { text: String(event.data.summary ?? "Capability completed"), tone: "success" };
    case "error":
      return { text: String(event.data.message ?? "Execution failed"), tone: "error" };
    case "flow.stage":
      return { text: `Flow · ${String(event.data.stage ?? "")}`, tone: "default" };
    default:
      return { text: label, tone: "default" };
  }
}

export function mapLegacyBrowserEvent(type: SandboxEventType): SandboxEventType {
  switch (type) {
    case "browser.launch":
      return "BROWSER_STARTED";
    case "page.goto":
      return "NAVIGATION_COMPLETED";
    case "element.find":
      return "ELEMENT_FOUND";
    case "input":
      return "TYPE";
    case "click":
      return "CLICK";
    case "extract":
      return "DATA_EXTRACTED";
    case "screenshot":
      return "SCREENSHOT";
    default:
      return type;
  }
}
