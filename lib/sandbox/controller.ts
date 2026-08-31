import { validateProductSearchInput } from "./capability/contracts";
import { requiresRealBrowser, resolveCapabilityRunner } from "./capability/index";
import { createBrowserRuntime } from "./browser/playwright-runtime";
import { SandboxCancelledError } from "./errors";
import { createSandboxEvent } from "./events";
import { publishSandboxUpdate } from "./event-stream";
import {
  closeActiveBrowser,
  isExecutionCancelled,
  isExecutionRunning,
  markExecutionFinished,
  markExecutionRunning,
  registerActiveBrowser,
  requestCancelExecution,
} from "./execution-engine";
import { recordSandboxExecution } from "./record-sandbox-execution";
import { verifySandboxOutput } from "./verify";
import {
  createSandboxSession,
  getSandboxSession,
  updateSandboxSession,
} from "./session-store";
import type {
  CreateSandboxSessionInput,
  ExecutionContext,
  SandboxEvent,
  SandboxExecutionError,
  SandboxFlowStage,
  SandboxLifecycleStatus,
  SandboxSession,
  SandboxSessionStatus,
} from "./types";

export function resolveSandboxBaseUrl(): string {
  if (process.env.SANDBOX_BASE_URL) {
    return process.env.SANDBOX_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

function mapLifecycleToStatus(lifecycle: SandboxLifecycleStatus): SandboxSessionStatus {
  switch (lifecycle) {
    case "CREATED":
      return "idle";
    case "QUEUED":
      return "idle";
    case "STARTING":
    case "RUNNING":
    case "WAITING":
      return "running";
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "idle";
  }
}

function patchSession(sessionId: string, patch: Partial<SandboxSession>): SandboxSession | null {
  const current = getSandboxSession(sessionId);
  if (!current) {
    return null;
  }
  const lifecycleStatus = patch.lifecycleStatus ?? current.lifecycleStatus;
  const nextPatch: Partial<SandboxSession> = {
    ...patch,
    status: patch.status ?? mapLifecycleToStatus(lifecycleStatus),
  };
  const next = updateSandboxSession(sessionId, nextPatch);
  if (next) {
    publishSandboxUpdate(next);
  }
  return next;
}

function appendEvent(sessionId: string, event: SandboxEvent): void {
  const current = getSandboxSession(sessionId);
  if (!current) {
    return;
  }
  const next = updateSandboxSession(sessionId, {
    events: [...current.events, event],
    metrics: {
      ...current.metrics,
      actionCount: current.metrics.actionCount + 1,
      stepCount: event.step ? current.metrics.stepCount + 1 : current.metrics.stepCount,
    },
  });
  if (next) {
    publishSandboxUpdate(next, event);
  }
}

function validateExecutionInput(
  capability: string,
  input: Record<string, unknown>,
): { ok: true } | { ok: false; errors: string[] } {
  if (capability === "product.search") {
    const parsed = validateProductSearchInput(input);
    return parsed.ok ? { ok: true } : { ok: false, errors: parsed.errors };
  }
  return { ok: true };
}

export class SandboxController {
  createSession(input: CreateSandboxSessionInput): SandboxSession {
    const session = createSandboxSession(input);
    publishSandboxUpdate(session);
    return session;
  }

  getSession(sessionId: string): SandboxSession | null {
    return getSandboxSession(sessionId);
  }

  queueExecution(sessionId: string): { ok: boolean; error?: string } {
    const session = getSandboxSession(sessionId);
    if (!session) {
      return { ok: false, error: "session_not_found" };
    }
    if (isExecutionRunning(sessionId)) {
      return { ok: false, error: "session_already_running" };
    }

    const validation = validateExecutionInput(session.capability, session.input);
    if (!validation.ok) {
      patchSession(sessionId, {
        lifecycleStatus: "FAILED",
        error: validation.errors.join("; "),
        structuredError: {
          code: "INVALID_INPUT",
          message: validation.errors.join("; "),
          step: "validate_input",
          recoverable: true,
        },
      });
      return { ok: false, error: "invalid_input" };
    }

    patchSession(sessionId, {
      lifecycleStatus: "QUEUED",
      flowStage: "request",
      error: null,
      structuredError: null,
      events: [],
      latestScreenshot: null,
      screenshots: [],
      output: null,
      verification: null,
      resultText: "",
      currentStep: null,
      startedAt: null,
      completedAt: null,
      metrics: { executionMs: 0, actionCount: 0, successRate: 100, stepCount: 0 },
    });

    void this.runCapability(sessionId);
    return { ok: true };
  }

  async runCapability(sessionId: string): Promise<{ ok: boolean; error?: string }> {
    const session = getSandboxSession(sessionId);
    if (!session) {
      return { ok: false, error: "session_not_found" };
    }
    if (!markExecutionRunning(sessionId)) {
      return { ok: false, error: "session_already_running" };
    }

    const runner = resolveCapabilityRunner(session.capability);
    if (!runner) {
      markExecutionFinished(sessionId);
      patchSession(sessionId, {
        lifecycleStatus: "FAILED",
        error: `unsupported_capability:${session.capability}`,
      });
      return { ok: false, error: "unsupported_capability" };
    }

    const startedAt = Date.now();
    patchSession(sessionId, {
      lifecycleStatus: "STARTING",
      flowStage: "request",
      intent: session.capability,
      startedAt,
    });

    const executionId = session.executionId;
    const context = this.createExecutionContext(sessionId, executionId, startedAt);

    let browser: Awaited<ReturnType<typeof createBrowserRuntime>> | null = null;

    try {
      patchSession(sessionId, { lifecycleStatus: "RUNNING" });

      browser = await createBrowserRuntime({
        requireReal: requiresRealBrowser(session.capability),
      });
      registerActiveBrowser(executionId, browser);

      const result = await runner.execute(
        session.capability,
        session.input,
        context,
        browser,
      );

      if (isExecutionCancelled(executionId)) {
        return this.finishCancelled(sessionId, startedAt);
      }

      const elapsed = Date.now() - startedAt;
      const current = getSandboxSession(sessionId);

      if (!result.ok) {
        const structuredError = result.structuredError ?? {
          code: "EXECUTION_FAILED",
          message: result.error ?? "execution_failed",
          step: current?.currentStep ?? "unknown",
          recoverable: true,
        };
        patchSession(sessionId, {
          lifecycleStatus: "FAILED",
          flowStage: "result",
          error: result.error ?? "execution_failed",
          structuredError,
          verification: { ok: false, errors: [result.error ?? "execution_failed"] },
          completedAt: Date.now(),
          metrics: {
            executionMs: elapsed,
            actionCount: current?.metrics.actionCount ?? 0,
            successRate: 0,
            stepCount: current?.metrics.stepCount ?? 0,
          },
        });
        recordSandboxExecution({
          sessionId,
          capabilityId: session.capability,
          userRequest: session.userRequest,
          ok: false,
          verified: false,
          executionMs: elapsed,
        });
        return { ok: false, error: result.error };
      }

      const verification = verifySandboxOutput(session.capability, result.output ?? null);

      patchSession(sessionId, {
        lifecycleStatus: verification.ok ? "COMPLETED" : "FAILED",
        flowStage: "result",
        output: result.output ?? null,
        verification,
        error: verification.ok ? null : verification.errors.join("; "),
        structuredError: verification.ok
          ? null
          : {
              code: "OUTPUT_VALIDATION_FAILED",
              message: verification.errors.join("; "),
              step: "validate_output",
              recoverable: true,
            },
        resultText: formatResultText(session.capability, result.output, verification.ok),
        completedAt: Date.now(),
        currentAction: null,
        metrics: {
          executionMs: elapsed,
          actionCount: current?.metrics.actionCount ?? 0,
          successRate: verification.ok ? 100 : 0,
          stepCount: current?.metrics.stepCount ?? 0,
        },
      });

      recordSandboxExecution({
        sessionId,
        capabilityId: session.capability,
        userRequest: session.userRequest,
        ok: true,
        verified: verification.ok,
        executionMs: elapsed,
      });

      return { ok: verification.ok, error: verification.ok ? undefined : verification.errors.join("; ") };
    } catch (error) {
      if (error instanceof SandboxCancelledError || isExecutionCancelled(executionId)) {
        return this.finishCancelled(sessionId, startedAt);
      }

      const message = error instanceof Error ? error.message : "execution_failed";
      const structuredError: SandboxExecutionError = {
        code: message === "PLAYWRIGHT_REQUIRED" ? "PLAYWRIGHT_REQUIRED" : "EXECUTION_FAILED",
        message,
        step: getSandboxSession(sessionId)?.currentStep ?? "unknown",
        recoverable: true,
      };

      appendEvent(
        sessionId,
        createSandboxEvent(executionId, "EXECUTION_FAILED", { message }, {
          step: structuredError.step,
          action: "Execution failed",
          status: "error",
          metadata: structuredError,
        }),
      );

      patchSession(sessionId, {
        lifecycleStatus: "FAILED",
        error: message,
        structuredError,
        completedAt: Date.now(),
        metrics: {
          executionMs: Date.now() - startedAt,
          actionCount: getSandboxSession(sessionId)?.metrics.actionCount ?? 0,
          successRate: 0,
          stepCount: getSandboxSession(sessionId)?.metrics.stepCount ?? 0,
        },
      });

      return { ok: false, error: message };
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          /* ignore */
        }
      }
      markExecutionFinished(executionId);
    }
  }

  private finishCancelled(sessionId: string, startedAt: number): { ok: boolean; error?: string } {
    const session = getSandboxSession(sessionId);
    const executionId = session?.executionId ?? sessionId;
    appendEvent(
      sessionId,
      createSandboxEvent(executionId, "EXECUTION_CANCELLED", {}, {
        step: session?.currentStep ?? "cancel",
        action: "Execution cancelled",
        status: "error",
      }),
    );
    patchSession(sessionId, {
      lifecycleStatus: "CANCELLED",
      status: "cancelled",
      currentAction: null,
      completedAt: Date.now(),
      metrics: {
        executionMs: Date.now() - startedAt,
        actionCount: session?.metrics.actionCount ?? 0,
        successRate: 0,
        stepCount: session?.metrics.stepCount ?? 0,
      },
    });
    return { ok: false, error: "execution_cancelled" };
  }

  async stopSession(sessionId: string): Promise<SandboxSession | null> {
    requestCancelExecution(sessionId);
    await closeActiveBrowser(sessionId);
    const startedAt = getSandboxSession(sessionId)?.startedAt ?? Date.now();
    this.finishCancelled(sessionId, startedAt);
    return getSandboxSession(sessionId);
  }

  retrySession(sessionId: string): SandboxSession | null {
    const previous = getSandboxSession(sessionId);
    if (!previous) {
      return null;
    }
    const next = this.createSession({
      capability: previous.capability,
      userRequest: previous.userRequest,
      input: previous.input,
      userId: previous.userId,
      projectId: previous.projectId,
      runtimeId: previous.runtimeId,
      retryOf: previous.sessionId,
    });
    this.queueExecution(next.sessionId);
    return getSandboxSession(next.sessionId) ?? next;
  }

  private createExecutionContext(
    sessionId: string,
    executionId: string,
    startedAt: number,
  ): ExecutionContext {
    return {
      sessionId,
      executionId,
      baseUrl: resolveSandboxBaseUrl(),
      isCancelled: () => isExecutionCancelled(executionId),
      emit: (type, data = {}) => {
        appendEvent(sessionId, createSandboxEvent(executionId, type, data));
      },
      emitStep: (input) => {
        if (input.step) {
          patchSession(sessionId, { currentStep: input.step });
        }
        appendEvent(
          sessionId,
          createSandboxEvent(executionId, input.type, input.metadata ?? {}, {
            step: input.step,
            action: input.action,
            target: input.target ?? null,
            metadata: input.metadata ?? {},
            durationMs: input.durationMs ?? null,
            status: input.status ?? "ok",
          }),
        );
      },
      setFlowStage: (stage: SandboxFlowStage) => {
        patchSession(sessionId, { flowStage: stage });
      },
      setCurrentAction: (action, step) => {
        patchSession(sessionId, {
          currentAction: action,
          currentStep: step ?? getSandboxSession(sessionId)?.currentStep ?? null,
        });
      },
      setAgentCursor: (cursor) => {
        const current = getSandboxSession(sessionId);
        if (!current) {
          return;
        }
        patchSession(sessionId, {
          agentCursor: { ...current.agentCursor, ...cursor },
        });
      },
      setScreenshot: (dataUrl, step) => {
        const current = getSandboxSession(sessionId);
        if (!current) {
          return;
        }
        const screenshots = step
          ? [...current.screenshots, { step, dataUrl, timestamp: Date.now() }]
          : current.screenshots;
        patchSession(sessionId, { latestScreenshot: dataUrl, screenshots });
        appendEvent(
          sessionId,
          createSandboxEvent(executionId, "SCREENSHOT", { step }, {
            step: step ?? null,
            action: "Screenshot captured",
            metadata: { step },
          }),
        );
      },
      fail: (error: SandboxExecutionError) => {
        patchSession(sessionId, { structuredError: error, error: error.message });
        appendEvent(
          sessionId,
          createSandboxEvent(executionId, "EXECUTION_FAILED", error, {
            step: error.step,
            action: "Execution failed",
            status: "error",
            metadata: error,
          }),
        );
        throw new Error(error.message);
      },
    };
  }
}

export const sandboxController = new SandboxController();

function formatResultText(capability: string, output: unknown, verified: boolean): string {
  if (!verified) {
    return "Verification failed";
  }
  if (
    capability === "hotel.search" &&
    output &&
    typeof output === "object" &&
    "hotelsFound" in (output as Record<string, unknown>)
  ) {
    return `${String((output as { hotelsFound: number }).hotelsFound)} hotels found`;
  }
  if (
    capability === "product.search" &&
    output &&
    typeof output === "object" &&
    "products" in (output as Record<string, unknown>)
  ) {
    const count = (output as { products: unknown[] }).products.length;
    return `${count} products found`;
  }
  if (
    capability === "hotel.detail" &&
    output &&
    typeof output === "object" &&
    "name" in (output as Record<string, unknown>)
  ) {
    return String((output as { name: string }).name);
  }
  return "Completed";
}

export function serializeSandboxSession(session: SandboxSession) {
  return {
    sessionId: session.sessionId,
    executionId: session.executionId,
    userId: session.userId,
    projectId: session.projectId,
    capability: session.capability,
    capabilityId: session.capability,
    runtimeId: session.runtimeId,
    runtime: session.runtime,
    browser: session.browser,
    environment: session.environment,
    lifecycleStatus: session.lifecycleStatus,
    status: session.status,
    flowStage: session.flowStage,
    userRequest: session.userRequest,
    intent: session.intent,
    resultText: session.resultText,
    currentStep: session.currentStep,
    input: session.input,
    output: session.output,
    events: session.events,
    latestScreenshot: session.latestScreenshot,
    screenshots: session.screenshots,
    currentAction: session.currentAction,
    agentCursor: session.agentCursor,
    metrics: session.metrics,
    verification: session.verification,
    structuredError: session.structuredError,
    error: session.error,
    retryOf: session.retryOf,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}
