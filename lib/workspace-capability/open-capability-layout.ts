/**
 * Seed Capability layout when a Context Workspace opens / expands.
 */

import {
  applyWorkspaceCapabilityOp,
  buildLayoutFromRecipe,
} from "@/lib/workspace-capability/apply-capability-op";
import {
  readWorkspaceCapabilityLayout,
  writeWorkspaceCapabilityLayout,
} from "@/lib/workspace-capability/layout-store";
import { resolveWorkspaceCapabilityIntentForState } from "@/lib/workspace-capability/resolve-capability-intent";
import type { WorkspaceCapabilityIntentId } from "@/lib/workspace-capability/types";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

export function openCapabilityLayoutForWorkspace(input: {
  readonly state: ContextWorkspaceState;
  readonly utterance?: string | null;
  /** Force recipe (e.g. trip prep always trip_plan). */
  readonly forceIntent?: WorkspaceCapabilityIntentId | null;
  /** Replace existing layout. Default: only seed when missing. */
  readonly replace?: boolean;
}): ReturnType<typeof readWorkspaceCapabilityLayout> {
  const contextEventId = input.state.contextEventId.trim();
  if (!contextEventId) return null;

  const existing = readWorkspaceCapabilityLayout(contextEventId);
  if (existing && !input.replace && !input.forceIntent) {
    return existing;
  }

  const intentId =
    input.forceIntent ??
    resolveWorkspaceCapabilityIntentForState({
      utterance: input.utterance,
      query: input.state.query,
      domain: input.state.domain,
      hasRealityDraftDays: (input.state.realityDraft?.days.length ?? 0) > 0,
    });

  if (existing && input.forceIntent && existing.intentId === input.forceIntent) {
    return existing;
  }

  const layout = buildLayoutFromRecipe({
    contextEventId,
    intentId,
    focusedDay: existing?.focusedDay ?? 1,
  });
  writeWorkspaceCapabilityLayout(layout);
  return layout;
}

/** Soft NL → Capability Object ops (예산 빼 / 날씨 크게 / 예약 오른쪽). */
export function tryApplyCapabilityUtterance(input: {
  readonly contextEventId: string;
  readonly utterance: string;
}): boolean {
  const t = input.utterance.trim();
  if (!t) return false;

  const closeBudget =
    /예산\s*(?:은\s*)?(?:필요\s*없|빼|닫|숨기)|budget\s*off|hide\s*budget/iu.test(
      t,
    );
  if (closeBudget) {
    applyWorkspaceCapabilityOp({
      contextEventId: input.contextEventId,
      op: { type: "close", id: "budget" },
    });
    return true;
  }

  const enlargeWeather =
    /날씨\s*(?:크게|확대|크게\s*보여)|weather\s*(?:large|bigger)/iu.test(t);
  if (enlargeWeather) {
    applyWorkspaceCapabilityOp({
      contextEventId: input.contextEventId,
      op: { type: "resize", id: "weather", size: "lg" },
    });
    applyWorkspaceCapabilityOp({
      contextEventId: input.contextEventId,
      op: { type: "open", id: "weather", size: "lg", slot: "floating" },
    });
    return true;
  }

  const moveBookingRight =
    /예약\s*(?:은\s*)?(?:오른쪽|우측)|booking\s*(?:right|to\s*the\s*right)/iu.test(
      t,
    );
  if (moveBookingRight) {
    applyWorkspaceCapabilityOp({
      contextEventId: input.contextEventId,
      op: { type: "move", id: "booking", slot: "right" },
    });
    return true;
  }

  const openCompare = /비교\s*(?:열어|보여)|compare\s*open/iu.test(t);
  if (openCompare) {
    applyWorkspaceCapabilityOp({
      contextEventId: input.contextEventId,
      op: { type: "open", id: "compare" },
    });
    return true;
  }

  return false;
}
