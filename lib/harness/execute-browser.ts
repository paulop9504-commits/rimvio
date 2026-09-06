/**
 * Harness → Browser Runtime execution (Phase 4).
 * Uses Playwright when available; otherwise SimulatedBrowserRuntime.
 * Desktop/Local is not executed here (fail-closed).
 */

import type { Harness, HarnessAction } from "@/lib/rimvio-protocol/harness/schema";
import { validateHarness } from "@/lib/harness/validate";
import { requiresApproval } from "@/lib/harness/validate";
import {
  createHarnessExecutionState,
  type HarnessActionExecutionLog,
  type HarnessExecutionState,
} from "@/lib/harness/execution-state";
import { createBrowserRuntime } from "@/lib/sandbox/browser/playwright-runtime";
import type { BrowserRuntime } from "@/lib/sandbox/types";
import { RESEARCH_NODE_ID, EXTRACT_NODE_ID, VERIFY_NODE_ID } from "@/lib/harness/labelling";

export type HarnessExecuteInput = {
  readonly harness: unknown;
  readonly variables?: Readonly<Record<string, string>>;
  readonly requireReal?: boolean;
  /** Explicit human approval for financial/delete/admin actions */
  readonly approved?: boolean;
};

export type HarnessExecuteResult = {
  readonly ok: boolean;
  readonly state: HarnessExecutionState;
  readonly screenshotDataUrl: string | null;
  readonly runtimeKind: "playwright" | "simulated" | "unsupported";
  readonly error: string | null;
};

function resolveTemplate(value: string | undefined, vars: Readonly<Record<string, string>>): string {
  if (!value) return "";
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function nowIso(): string {
  return new Date().toISOString();
}

async function detectRuntimeKind(requireReal?: boolean): Promise<"playwright" | "simulated"> {
  const { isPlaywrightAvailable } = await import("@/lib/sandbox/browser/playwright-runtime");
  if (await isPlaywrightAvailable()) return "playwright";
  if (requireReal) throw new Error("PLAYWRIGHT_REQUIRED");
  return "simulated";
}

export async function executeHarnessAction(
  runtime: BrowserRuntime,
  action: HarnessAction,
  variables: Readonly<Record<string, string>>,
): Promise<{ observation: unknown }> {
  switch (action.type) {
    case "GET":
    case "NAVIGATE": {
      const url = action.target?.url || resolveTemplate(action.input, variables);
      if (!url) throw new Error("navigate_missing_url");
      await runtime.navigate(url);
      return { observation: { url } };
    }
    case "CLICK": {
      const selector = action.target?.selector || action.selector;
      if (!selector) throw new Error("click_missing_selector");
      await runtime.click(selector);
      return { observation: { selector } };
    }
    case "TYPE": {
      const selector = action.target?.selector || action.selector;
      if (!selector) throw new Error("type_missing_selector");
      const text = resolveTemplate(action.input, variables);
      await runtime.type(selector, text);
      return { observation: { selector, text } };
    }
    case "WAIT": {
      const selector =
        action.waitFor?.selector || action.target?.selector || action.selector;
      if (selector) {
        await runtime.waitForSelector(selector);
        return { observation: { waitedFor: selector } };
      }
      const ms = action.waitFor?.ms ?? action.timeout ?? 500;
      await runtime.wait(ms);
      return { observation: { waitedMs: ms } };
    }
    case "SCROLL": {
      const selector = action.target?.selector || action.selector || "body";
      await runtime.scroll(selector);
      return { observation: { selector } };
    }
    case "OBSERVE":
    case "READ": {
      const selector = action.target?.selector || action.selector;
      if (!selector) return { observation: { ok: true } };
      const text = await runtime.extractText(selector);
      return { observation: { selector, text } };
    }
    case "EXTRACT": {
      const fields = action.fields ?? [];
      const extracted: Record<string, string> = {};
      for (const field of fields) {
        extracted[field.name] = await runtime.extractText(field.selector);
      }
      return { observation: { fields: extracted } };
    }
    case "EXECUTE":
    case "CREATE":
    case "UPDATE":
    case "DELETE":
    case "COMMUNICATE":
      throw new Error(`action_not_supported_in_browser_runtime:${action.type}`);
    default:
      throw new Error(`unknown_action:${String(action.type)}`);
  }
}

export async function executeHarnessInBrowser(
  input: HarnessExecuteInput,
): Promise<HarnessExecuteResult> {
  const parsed = validateHarness(input.harness);
  if (!parsed.ok) {
    const state = createHarnessExecutionState({
      executionId: `exec_invalid_${Date.now()}`,
      harnessId: "invalid",
      harnessVersion: "0.0.0",
    });
    return {
      ok: false,
      state: { ...state, status: "FAILED" },
      screenshotDataUrl: null,
      runtimeKind: "unsupported",
      error: parsed.issues.map((i) => `${i.path}: ${i.message}`).join("; "),
    };
  }

  const harness = parsed.harness;
  const executionId = `exec_${Date.now()}`;
  let state = createHarnessExecutionState({
    executionId,
    harnessId: harness.id,
    harnessVersion: harness.version,
  });

  if (harness.runtime.type !== "BROWSER") {
    state = {
      ...state,
      status: "FAILED",
      finishedAt: nowIso(),
      updatedAt: nowIso(),
      logs: [
        {
          executionId,
          harnessId: harness.id,
          actionId: "runtime",
          timestamp: nowIso(),
          status: "FAILED",
          error: {
            code: "UNSUPPORTED_RUNTIME",
            message: `Browser executor only supports BROWSER (got ${harness.runtime.type}). Use Local Agent for DESKTOP.`,
            retriable: false,
          },
        },
      ],
    };
    return {
      ok: false,
      state,
      screenshotDataUrl: null,
      runtimeKind: "unsupported",
      error: "UNSUPPORTED_RUNTIME",
    };
  }

  if (requiresApproval(harness) && !input.approved) {
    state = {
      ...state,
      status: "FAILED",
      approvalPending: true,
      finishedAt: nowIso(),
      updatedAt: nowIso(),
      logs: [
        {
          executionId,
          harnessId: harness.id,
          actionId: "approval",
          timestamp: nowIso(),
          status: "FAILED",
          error: {
            code: "APPROVAL_REQUIRED",
            message: "Dangerous permissions require explicit approved=true",
            retriable: false,
          },
        },
      ],
    };
    return {
      ok: false,
      state,
      screenshotDataUrl: null,
      runtimeKind: "unsupported",
      error: "APPROVAL_REQUIRED",
    };
  }

  const variables = input.variables ?? {};
  let runtimeKind: "playwright" | "simulated" = "simulated";
  let runtime: BrowserRuntime | null = null;
  const logs: HarnessActionExecutionLog[] = [];
  let screenshotDataUrl: string | null = null;

  try {
    runtimeKind = await detectRuntimeKind(input.requireReal);
    runtime = await createBrowserRuntime({ requireReal: input.requireReal });
    state = { ...state, status: "RUNNING", updatedAt: nowIso() };
    await runtime.launch();

    const orderedNodes = harness.nodes.filter((n) =>
      [RESEARCH_NODE_ID, EXTRACT_NODE_ID, VERIFY_NODE_ID, "n_research", "n_extract", "n_verify"].includes(
        n.id,
      ) || n.type === "RESEARCH" || n.type === "EXTRACT" || n.type === "VERIFY" || n.type === "ACTION",
    );
    // Prefer labelling skeleton order; else all nodes with actions / verify
    const nodesToRun =
      orderedNodes.length > 0
        ? harness.nodes.filter(
            (n) =>
              n.id === RESEARCH_NODE_ID ||
              n.id === EXTRACT_NODE_ID ||
              n.id === VERIFY_NODE_ID ||
              n.actions.length > 0 ||
              n.verification.length > 0,
          )
        : harness.nodes;

    for (const node of nodesToRun) {
      for (const action of node.actions) {
        const started = Date.now();
        try {
          const { observation } = await executeHarnessAction(runtime, action, variables);
          logs.push({
            executionId,
            harnessId: harness.id,
            nodeId: node.id,
            actionId: action.id,
            timestamp: nowIso(),
            status: "SUCCESS",
            input: action.input,
            target: action.target ?? action.selector,
            observation,
            durationMs: Date.now() - started,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logs.push({
            executionId,
            harnessId: harness.id,
            nodeId: node.id,
            actionId: action.id,
            timestamp: nowIso(),
            status: "FAILED",
            target: action.target ?? action.selector,
            error: { code: "ACTION_FAILED", message, retriable: true },
            durationMs: Date.now() - started,
          });
          state = {
            ...state,
            status: "FAILED",
            currentNodeId: node.id,
            currentActionId: action.id,
            logs,
            finishedAt: nowIso(),
            updatedAt: nowIso(),
          };
          try {
            const buf = await runtime.screenshot();
            screenshotDataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
          } catch {
            /* ignore */
          }
          return {
            ok: false,
            state,
            screenshotDataUrl,
            runtimeKind,
            error: message,
          };
        }
      }

      for (const verification of node.verification) {
        if (verification.type !== "ELEMENT_EXISTS") continue;
        const selector = verification.target?.selector;
        if (!selector) continue;
        const started = Date.now();
        try {
          const count = await runtime.count(selector);
          if (count < 1) {
            throw new Error(`element_not_found:${selector}`);
          }
          logs.push({
            executionId,
            harnessId: harness.id,
            nodeId: node.id,
            actionId: verification.id,
            timestamp: nowIso(),
            status: "SUCCESS",
            verification: { type: verification.type, selector, count },
            durationMs: Date.now() - started,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logs.push({
            executionId,
            harnessId: harness.id,
            nodeId: node.id,
            actionId: verification.id,
            timestamp: nowIso(),
            status: "FAILED",
            verification: { type: verification.type, selector },
            error: { code: "VERIFICATION_FAILED", message, retriable: false },
            durationMs: Date.now() - started,
          });
          state = {
            ...state,
            status: "FAILED",
            logs,
            finishedAt: nowIso(),
            updatedAt: nowIso(),
          };
          return {
            ok: false,
            state,
            screenshotDataUrl,
            runtimeKind,
            error: message,
          };
        }
      }
    }

    try {
      const buf = await runtime.screenshot();
      screenshotDataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
    } catch {
      /* ignore */
    }

    state = {
      ...state,
      status: "SUCCESS",
      logs,
      finishedAt: nowIso(),
      updatedAt: nowIso(),
    };
    return {
      ok: true,
      state,
      screenshotDataUrl,
      runtimeKind,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    state = {
      ...state,
      status: "FAILED",
      logs,
      finishedAt: nowIso(),
      updatedAt: nowIso(),
    };
    return {
      ok: false,
      state,
      screenshotDataUrl,
      runtimeKind,
      error: message,
    };
  } finally {
    if (runtime) {
      try {
        await runtime.close();
      } catch {
        /* ignore */
      }
    }
  }
}
