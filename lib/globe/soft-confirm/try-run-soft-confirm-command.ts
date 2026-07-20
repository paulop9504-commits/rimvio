/**
 * Soft confirm entry — Filter / Pin / Delete → chips (not Field Commit).
 */

import type { ContextNlActionResult } from "@/lib/action-planner/context-nl-types";
import { copy } from "@/lib/copy/human-ko";
import { parseGraphCommands } from "@/lib/graph-command/parse-graph-commands";
import { ensureSessionGraph } from "@/lib/graph-command/session-graph-store";
import type { GraphCommand } from "@/lib/graph-command/types";
import { writeSoftConfirmPending } from "@/lib/globe/soft-confirm/soft-confirm-pending-store";
import type {
  SoftConfirmChip,
  SoftConfirmKind,
} from "@/lib/globe/soft-confirm/types";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { SOFT_CONFIRM_INTENTS } from "@/lib/rule-engine/constitution";

export function buildSoftConfirmChips(): readonly SoftConfirmChip[] {
  return [
    {
      id: "soft_confirm_apply",
      labelKo: copy.globe.softConfirmApplyChip,
      gapId: "apply",
      value: "apply",
    },
    {
      id: "soft_confirm_cancel",
      labelKo: copy.globe.softConfirmCancelChip,
      gapId: "cancel",
      value: "cancel",
    },
  ];
}

function softKindForCommand(
  command: GraphCommand,
): SoftConfirmKind | null {
  if (command.op === "filter") {
    return "filter";
  }
  if (command.op === "pin_node") {
    return "pin";
  }
  if (command.op === "delete_node") {
    return "delete";
  }
  if (command.op === "share_context") {
    return "share";
  }
  return null;
}

function summaryFor(kind: SoftConfirmKind, command: GraphCommand): string {
  if (kind === "filter") {
    return copy.globe.softConfirmFilterSummary;
  }
  if (kind === "pin" && "targetRef" in command) {
    return copy.globe.softConfirmPinSummary(command.targetRef.labelKo);
  }
  if (kind === "delete" && "targetRef" in command) {
    return copy.globe.softConfirmDeleteSummary(command.targetRef.labelKo);
  }
  if (kind === "share" && "targetRef" in command) {
    return copy.globe.softConfirmShareSummary(command.targetRef.labelKo);
  }
  return copy.globe.softConfirmGenericSummary;
}

/**
 * Gate graph condition edits behind soft confirm chips.
 * Search / Reserve / Revise stay on their own paths.
 */
export function tryRunSoftConfirmCommand(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): Extract<ContextNlActionResult, { via: "soft_confirm" }> | null {
  const text = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!text || !contextEventId) {
    return null;
  }

  const intent = classifyIntentFamily(text);
  if (!SOFT_CONFIRM_INTENTS.has(intent) || intent === "Revise") {
    return null;
  }

  const graph = ensureSessionGraph({
    contextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  const commands = parseGraphCommands(text, graph);
  if (!commands.length) {
    return null;
  }

  const command = commands[0]!;
  const kind = softKindForCommand(command);
  if (!kind) {
    return null;
  }

  const summaryKo = summaryFor(kind, command);
  const confirmHintKo = copy.globe.softConfirmHint(summaryKo);
  writeSoftConfirmPending(contextEventId, {
    kind,
    summaryKo,
    confirmHintKo,
    commands,
    utterance: text,
    atIso: new Date().toISOString(),
  });

  return {
    ok: true,
    via: "soft_confirm",
    contextEventId,
    assistantReplyKo: confirmHintKo,
    reservedOpIds: [],
    waitingCommit: false,
    softConfirmKind: kind,
    softConfirmChips: buildSoftConfirmChips(),
  };
}
