import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import {
  removePendingScheduledAction,
  upsertPendingScheduledAction,
  readPendingScheduledActions,
} from "@/lib/action-chat/chat-scheduled-actions-store";

const activeTimers = new Map<string, number>();

function timerKey(scopeId: string, messageId: string) {
  return `${scopeId}:${messageId}`;
}

export function disarmScheduledActionDelivery(scopeId: string, messageId: string) {
  const key = timerKey(scopeId, messageId);
  const existing = activeTimers.get(key);
  if (existing) {
    window.clearTimeout(existing);
    activeTimers.delete(key);
  }
  removePendingScheduledAction(scopeId, messageId);
}

export function armScheduledActionDelivery(input: {
  scopeId: string;
  messageId: string;
  extracted: ConfirmationExtractedData;
  onFire: () => void;
}) {
  const fireAt = input.extracted.datetime;
  const target = parseActionTargetDatetime(fireAt);
  if (!target) {
    return;
  }

  const delay = target.getTime() - Date.now();
  const key = timerKey(input.scopeId, input.messageId);

  disarmScheduledActionDelivery(input.scopeId, input.messageId);

  upsertPendingScheduledAction({
    scopeId: input.scopeId,
    messageId: input.messageId,
    fireAt: fireAt!,
    extracted: input.extracted,
  });

  if (delay <= 0) {
    input.onFire();
    return;
  }

  const timer = window.setTimeout(() => {
    activeTimers.delete(key);
    removePendingScheduledAction(input.scopeId, input.messageId);
    input.onFire();
  }, delay);

  activeTimers.set(key, timer);
}

export function restoreScheduledActionDeliveries(input: {
  scopeId: string;
  onFire: (messageId: string, extracted: ConfirmationExtractedData) => void;
}) {
  for (const record of readPendingScheduledActions(input.scopeId)) {
    armScheduledActionDelivery({
      scopeId: input.scopeId,
      messageId: record.messageId,
      extracted: record.extracted,
      onFire: () => input.onFire(record.messageId, record.extracted),
    });
  }
}
