/**
 * Poll sandbox session until terminal lifecycle — used by composite loops
 * so browser steps complete before advancing pipeline.
 */

import { getSandboxSession } from "./session-store";
import type { SandboxLifecycleStatus, SandboxSession } from "./types";

const TERMINAL: ReadonlySet<SandboxLifecycleStatus> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export type WaitForSandboxSessionResult = {
  readonly session: SandboxSession | null;
  readonly timedOut: boolean;
};

export async function waitForSandboxSession(
  sessionId: string,
  options?: {
    readonly timeoutMs?: number;
    readonly pollMs?: number;
  },
): Promise<WaitForSandboxSessionResult> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollMs = options?.pollMs ?? 250;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const session = getSandboxSession(sessionId);
    if (session && TERMINAL.has(session.lifecycleStatus)) {
      return { session, timedOut: false };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { session: getSandboxSession(sessionId), timedOut: true };
}

export function isSandboxSessionSuccessful(session: SandboxSession | null): boolean {
  if (!session) return false;
  if (session.lifecycleStatus !== "COMPLETED") return false;
  if (session.verification && !session.verification.ok) return false;
  return true;
}
