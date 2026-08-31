import type { SandboxExecutionError } from "./types";

export class SandboxCancelledError extends Error {
  readonly code = "EXECUTION_CANCELLED";

  constructor() {
    super("EXECUTION_CANCELLED");
    this.name = "SandboxCancelledError";
  }
}

export function sandboxError(
  code: string,
  message: string,
  step: string,
  recoverable = true,
): SandboxExecutionError {
  return { code, message, step, recoverable };
}

export function elementNotFound(step: string, selector: string): SandboxExecutionError {
  return sandboxError(
    "ELEMENT_NOT_FOUND",
    `${selector} could not be found`,
    step,
    true,
  );
}

export function playwrightRequired(step: string): SandboxExecutionError {
  return sandboxError(
    "PLAYWRIGHT_REQUIRED",
    "Real browser execution requires Playwright Chromium. Run: npx playwright install chromium",
    step,
    true,
  );
}
