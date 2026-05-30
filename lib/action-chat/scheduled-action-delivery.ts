import { buildActionsFromConfirmationData } from "@/lib/action-chat/build-confirmation-actions";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import type { LinkActionItem } from "@/types/database";

export type ScheduledActionDelivery = {
  fire_at: string;
  status: "pending" | "fired";
};

export function isFutureScheduledDatetime(iso: string | null | undefined): boolean {
  const target = parseActionTargetDatetime(iso);
  if (!target) {
    return false;
  }
  return target.getTime() > Date.now() + 5_000;
}

export function buildScheduledPlaceNavActions(
  extracted: ConfirmationExtractedData,
  sourceMessage?: string | null
): LinkActionItem[] {
  const placeName = sanitizePlaceNameForNavigation(extracted.place_name, sourceMessage);
  return buildActionsFromConfirmationData(
    {
      ...extracted,
      place_name: placeName,
      datetime: null,
    },
    sourceMessage
  ).filter((action) => !/일정\s*추가|calendar/i.test(action.label));
}

export function formatScheduledDeliverySummary(input: {
  placeLabel: string;
  fireAt: string;
}): string {
  const target = parseActionTargetDatetime(input.fireAt);
  if (!target) {
    return `${input.placeLabel} 일정을 캘린더에 넣어뒀어요.`;
  }

  const remainingMs = target.getTime() - Date.now();
  const minutes = Math.max(1, Math.round(remainingMs / 60_000));
  return `${minutes}분 뒤 ${input.placeLabel} 일정을 캘린더에 넣어뒀어요. 시간되면 길찾기를 꺼낼게요.`;
}

export function formatScheduledFireSummary(placeLabel: string): string {
  return `${placeLabel} 가실 시간이에요!`;
}

export async function saveScheduledTravelToCalendar(input: {
  extracted: ConfirmationExtractedData;
  sourceMessage: string;
}) {
  const label = input.extracted.place_name ?? input.extracted.address ?? "일정";
  const value = input.extracted.datetime;
  if (!value) {
    return null;
  }

  return saveKnowledgeEntity({
    containerId: FIXED_CALENDAR_CONTAINER_ID,
    type: "schedule",
    label,
    value,
    sourceMessage: input.sourceMessage,
  });
}

export function shouldDeferActionsForSchedule(extracted: ConfirmationExtractedData): boolean {
  return Boolean(
    (extracted.place_name || extracted.address) &&
      extracted.datetime &&
      isFutureScheduledDatetime(extracted.datetime)
  );
}
