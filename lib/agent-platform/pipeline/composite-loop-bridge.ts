/**
 * Client-safe composite loop bridge — avoids pulling server invoke/sandbox into browser bundles.
 */

import type { CompositeLoopResult } from "../types";

export async function runCompositeLoopForProduct(input: {
  readonly loopId: string;
  readonly contextEventId: string;
  readonly userRequest?: string;
}): Promise<CompositeLoopResult> {
  if (typeof window === "undefined") {
    const { runCompositeLoop } = await import("./run-composite-loop");
    return runCompositeLoop(input);
  }

  try {
    const res = await fetch("/api/agent-platform/composite/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return (await res.json()) as CompositeLoopResult;
  } catch {
    return {
      ok: false,
      loopId: input.loopId,
      goalKo: input.loopId,
      stepsCompleted: 0,
      totalSteps: 0,
      goalPercent: 0,
      logs: [],
      lastInvoke: null,
      workLogKo: "Composite loop API unavailable",
    };
  }
}

export async function resumeCompositeLoopForProduct(input: {
  readonly contextEventId: string;
  readonly userRequest?: string;
}): Promise<CompositeLoopResult | null> {
  if (typeof window === "undefined") {
    const { resumeCompositeLoop } = await import("./run-composite-loop");
    return resumeCompositeLoop(input);
  }

  try {
    const res = await fetch("/api/agent-platform/composite/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, resume: true }),
    });
    if (!res.ok) return null;
    return (await res.json()) as CompositeLoopResult;
  } catch {
    return null;
  }
}
