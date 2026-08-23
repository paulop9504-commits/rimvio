import type { ExecutionEngine } from "./types.js";
import { MockExecutionEngine } from "./mock-engine.js";
import { BrowserExecutionEngine } from "./browser-engine.js";

export function createExecutionEngine(mode: string): ExecutionEngine {
  if (mode === "mock") {
    return new MockExecutionEngine();
  }
  return new BrowserExecutionEngine();
}

export * from "./types.js";
