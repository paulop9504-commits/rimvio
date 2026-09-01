/**
 * Browser sandbox verify → repair retry (Cursor-style self-heal).
 */

import { getSandboxSession } from "@/lib/sandbox/session-store";
import type { SandboxSession } from "@/lib/sandbox/types";
import { planCapabilityRepair } from "./repair-invoke";

const DEFAULT_MAX_REPAIR = 2;

export function countSandboxRepairChain(sessionId: string): number {
  let count = 0;
  let current = getSandboxSession(sessionId);
  while (current?.retryOf) {
    count += 1;
    current = getSandboxSession(current.retryOf);
  }
  return count;
}

export function planSandboxRepair(input: {
  readonly session: SandboxSession;
  readonly errors: readonly string[];
}): ReturnType<typeof planCapabilityRepair> {
  const attempt = countSandboxRepairChain(input.session.sessionId) + 1;
  if (attempt > DEFAULT_MAX_REPAIR) return null;

  return planCapabilityRepair({
    capabilityId: input.session.capability,
    currentInput: input.session.input,
    errors: input.errors,
    attempt,
  });
}
