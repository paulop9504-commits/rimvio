import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  isMentionCalendarInput,
  tryBuildMentionCalendarTurn,
} from "@/lib/action-chat/mention-calendar/commit-mention-calendar-turn";
import {
  isMentionFocusInput,
  tryBuildMentionFocusTurn,
} from "@/lib/action-chat/mention-focus/commit-mention-focus-turn";
import {
  isMentionNavigateInput,
  tryBuildMentionNavigateTurn,
} from "@/lib/action-chat/mention-navigate/commit-mention-navigate-turn";
import {
  isMentionLinksheetInput,
  tryBuildMentionLinksheetTurn,
} from "@/lib/action-chat/mention-linksheet/commit-mention-linksheet-turn";
import {
  isMentionActionInput,
  tryBuildMentionActionTurn,
} from "@/lib/action-chat/mention-actions/commit-mention-action-turn";
import {
  isMentionParkingInput,
  tryBuildMentionParkingTurn,
} from "@/lib/action-chat/mention-parking/commit-mention-parking-turn";
import {
  isMentionReminderInput,
  tryBuildMentionReminderTurn,
} from "@/lib/action-chat/mention-reminder/commit-mention-reminder-turn";
import {
  isMentionScheduleOrganizeInput,
  tryBuildMentionScheduleOrganizeTurn,
} from "@/lib/action-chat/mention-schedule-organize/commit-mention-schedule-organize-turn";
import {
  isMentionTimerInput,
  tryBuildMentionTimerTurn,
} from "@/lib/action-chat/mention-timer/commit-mention-timer-turn";
import {
  isMentionTransferInput,
  tryBuildMentionTransferTurn,
} from "@/lib/action-chat/mention-transfer/commit-mention-transfer-turn";
import {
  isEndPeerTalkMentionInput,
  tryBuildMentionEndPeerTalkTurn,
  type EndPeerTalkTurnDeps,
} from "@/lib/action-chat/mention-peer-talk-end/commit-mention-end-peer-talk-turn";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

export type LocalMentionTurnInput = {
  text: string;
  chatAxis?: ChatAxis;
  activeLink?: { id: string; title: string; original_url: string } | null;
  referenceDate?: string;
  endPeerTalkDeps?: EndPeerTalkTurnDeps;
};

/** Single dispatch for all local @ mention turns (no orchestrator). */
export function tryDispatchLocalMentionTurn(
  input: LocalMentionTurnInput,
): ActionChatMessage[] | null {
  const { text, chatAxis } = input;

  if (input.endPeerTalkDeps) {
    const endTalkTurn = tryBuildMentionEndPeerTalkTurn(
      { text, chatAxis },
      input.endPeerTalkDeps,
    );
    if (endTalkTurn) {
      return endTalkTurn;
    }
  }

  const timerTurn = tryBuildMentionTimerTurn({ text, chatAxis });
  if (timerTurn) {
    return timerTurn;
  }

  const calendarTurn = tryBuildMentionCalendarTurn({ text, chatAxis });
  if (calendarTurn) {
    return calendarTurn;
  }

  const reminderTurn = tryBuildMentionReminderTurn({
    text,
    chatAxis,
    activeLink: input.activeLink ?? null,
    referenceDate: input.referenceDate,
  });
  if (reminderTurn) {
    return reminderTurn;
  }

  const navigateTurn = tryBuildMentionNavigateTurn({ text, chatAxis });
  if (navigateTurn) {
    return navigateTurn;
  }

  const organizeTurn = tryBuildMentionScheduleOrganizeTurn({ text, chatAxis });
  if (organizeTurn) {
    return organizeTurn;
  }

  const transferTurn = tryBuildMentionTransferTurn({ text, chatAxis });
  if (transferTurn) {
    return transferTurn;
  }

  const parkingTurn = tryBuildMentionParkingTurn({ text, chatAxis });
  if (parkingTurn) {
    return parkingTurn;
  }

  const focusTurn = tryBuildMentionFocusTurn({ text, chatAxis });
  if (focusTurn) {
    return focusTurn;
  }

  const linksheetTurn = tryBuildMentionLinksheetTurn({ text, chatAxis });
  if (linksheetTurn) {
    return linksheetTurn;
  }

  if (isMentionActionInput(text)) {
    const actionTurn = tryBuildMentionActionTurn({
      text,
      chatAxis,
      referenceDate: input.referenceDate,
    });
    if (actionTurn) {
      return actionTurn;
    }
  }

  return null;
}

export function isLocalMentionInput(text: string): boolean {
  return (
    isEndPeerTalkMentionInput(text) ||
    isMentionTimerInput(text) ||
    isMentionCalendarInput(text) ||
    isMentionReminderInput(text) ||
    isMentionNavigateInput(text) ||
    isMentionScheduleOrganizeInput(text) ||
    isMentionTransferInput(text) ||
    isMentionParkingInput(text) ||
    isMentionFocusInput(text) ||
    isMentionLinksheetInput(text) ||
    isMentionActionInput(text)
  );
}
