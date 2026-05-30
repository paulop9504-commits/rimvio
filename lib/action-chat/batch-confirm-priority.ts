import {
  actionAgentBatchToItems,
  processActionAgentBatch,
} from "@/lib/action-chat/action-agent-batch";
import { tryActionAgentBatch } from "@/lib/action-chat/orchestrate-action-agent-batch";
import {
  assessPlaceConfirmationNeed,
  buildConfirmationOrchestratorResult,
} from "@/lib/action-chat/confirmation-logic";
import { generatePersonaConfirmMessage } from "@/lib/action-chat/confirm-message-generator";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";
import { resolveActionAgentReferenceDate } from "@/lib/action-chat/action-agent-prompt";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

/**
 * Priority 0: ambiguous place CONFIRM roots the turn.
 * Confirmed batch items (phone, datetime, …) defer to batch_pending.
 */
export function tryBatchConfirmPriority(input: {
  message: string;
  referenceDate?: string | null;
  existingSchedule?: ExistingScheduleInput;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  const referenceDate = resolveActionAgentReferenceDate(input.referenceDate);
  const confirm = assessPlaceConfirmationNeed({ message, referenceDate });

  const batchWire = processActionAgentBatch(message, { referenceDate });
  const batchItems =
    batchWire && batchWire.results.length > 0
      ? actionAgentBatchToItems(batchWire)
      : [];

  if (confirm?.needsConfirm) {
    const pending = batchItems.filter(
      (item) => item.type !== "ADDRESS" && item.type !== "PLACE"
    );

    const subject =
      sanitizePlaceNameForNavigation(confirm.extracted_data.place_name, message) ??
      confirm.extracted_data.address?.slice(0, 24) ??
      "선택한 장소";

    const persona_message = generatePersonaConfirmMessage({
      locationLabel: subject,
      category: "PLACE",
      hasBatchPending: pending.length > 0,
      referenceDate,
    });

    const thought =
      pending.length > 0
        ? `Found: ${subject}·${pending.map((p) => p.type).join("·")}. Intent: 장소 확인 후 ${pending.length}건 처리. Missing: ${subject} 정확한 지점.`
        : `Found: ${subject}. Intent: 장소 확인 후 실행. Missing: ${subject} 정확한 지점.`;

    return buildConfirmationOrchestratorResult({
      persona_message,
      data_prompt: confirm.data_prompt,
      extracted_data: confirm.extracted_data,
      confidence: confirm.confidence,
      thought,
      confirm_data: {
        subject,
        category: "PLACE",
      },
      batch_pending: pending.map((item) => ({
        type: item.type,
        summary: item.summary,
        extracted_data: item.extracted_data,
      })),
    });
  }

  if (batchWire && batchWire.results.length >= 2) {
    return tryActionAgentBatch({
      message,
      referenceDate,
      existingSchedule: input.existingSchedule,
    });
  }

  return null;
}
