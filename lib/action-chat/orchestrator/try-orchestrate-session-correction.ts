import { actionIntentToMasterWire } from "@/lib/action-dispatcher/action-intent-to-master-wire";
import { normalizeMasterOrchestratorWire } from "@/lib/action-chat/normalize-master-result";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  applySessionIntentCorrection,
  commitSessionIntent,
  extractCorrectionTarget,
  getSessionIntent,
  isCorrectionMessage,
  sessionIntentToActionIntent,
} from "@/lib/action-os/session-intent-state";

/** Phase 1 · Tier 2 — session intent correction → operable NAVIGATE (etc.). */
export function tryOrchestrateSessionCorrection(input: {
  message: string;
  scopeId?: string;
  existingSchedule?: Array<{ time: string; task: string }>;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message || !isCorrectionMessage(message)) {
    return null;
  }

  const scopeId = input.scopeId ?? "default";
  const previous = getSessionIntent(scopeId);
  const corrected = applySessionIntentCorrection({ message, previous });

  if (corrected) {
    commitSessionIntent(corrected, scopeId);
    const wire = actionIntentToMasterWire(sessionIntentToActionIntent(corrected));
    return normalizeMasterOrchestratorWire({
      wire,
      source: "rules",
      existingSchedule: input.existingSchedule ?? [],
    });
  }

  const target = extractCorrectionTarget(message);
  if (target && !previous) {
    const wire = actionIntentToMasterWire({
      action_id: "NAVIGATE",
      params: { dest: target },
      fallback_url: "https://map.naver.com",
      thought: `Correction without prior session — new intent dest='${target}'.`,
    });
    commitSessionIntent(
      {
        action_id: "NAVIGATE",
        params: { dest: target },
        fallback_url: "https://map.naver.com",
        updatedAt: new Date().toISOString(),
      },
      scopeId
    );
    return normalizeMasterOrchestratorWire({
      wire,
      source: "rules",
      existingSchedule: input.existingSchedule ?? [],
    });
  }

  return null;
}
