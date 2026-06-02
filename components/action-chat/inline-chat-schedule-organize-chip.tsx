"use client";

import { useMemo } from "react";
import { ListChecks } from "lucide-react";
import { AuxSeedButton } from "@/components/action-chat/aux-seed-button";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import {
  buildScheduleOrganizeSnapshot,
} from "@/lib/action-chat/mention-schedule-organize/build-schedule-organize-snapshot";
import type { InlineChatScheduleOrganizeWire } from "@/lib/action-chat/mention-schedule-organize/inline-chat-schedule-organize";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import {
  glangoInlineChipBodyClass,
  glangoInlineChipClass,
  glangoInlineChipHeaderClass,
  glangoInlineChipMetaClass,
  glangoInlineChipTitleClass,
} from "@/lib/brand/glango-neon-theme";
import { cn } from "@/lib/utils";

type InlineChatScheduleOrganizeChipProps = {
  organize: InlineChatScheduleOrganizeWire;
  overlayRows: UnifiedCalendarOverlayRow[];
  onRebalancePrompt?: (prompt: string) => void;
  onOpenCalendar?: () => void;
  className?: string;
};

export function InlineChatScheduleOrganizeChip({
  organize,
  overlayRows,
  onRebalancePrompt,
  onOpenCalendar,
  className,
}: InlineChatScheduleOrganizeChipProps) {
  const snapshot = useMemo(
    () =>
      buildScheduleOrganizeSnapshot({
        overlayRows,
        query: organize.query,
      }),
    [overlayRows, organize.query],
  );

  return (
    <div
      className={cn(glangoInlineChipClass("md"), className)}
      aria-label="일정정리"
    >
      <div className={glangoInlineChipHeaderClass}>
        <ListChecks className="size-4 shrink-0 text-glango-neon-purple" aria-hidden />
        <span className={glangoInlineChipTitleClass}>일정정리</span>
        <span className={glangoInlineChipMetaClass}>{snapshot.scopeLabel}</span>
      </div>

      <div className={cn(glangoInlineChipBodyClass, "space-y-2")}>
        <p className="glango-inline-chip__text-muted">{snapshot.summaryLine}</p>

        {snapshot.items.length > 0 ? (
          <ul className="space-y-1">
            {snapshot.items.map((item) => (
              <li key={item.id} className="glango-inline-chip__row">
                <span className="glango-inline-chip__row-time">{item.timeLabel}</span>
                <span className="glango-inline-chip__row-title">{item.title}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {snapshot.conflictCount > 0 ? (
          <p className="text-[11px] font-medium text-glango-neon-amber">
            겹침 {snapshot.conflictCount}건 — 기존 일정은 유지한 채 조정할 수 있어요
          </p>
        ) : null}

        {onOpenCalendar ? (
          <MainActionButton
            label="캘린더에서 보기"
            brandFrom={{ label: "Google Calendar", provider: "google" }}
            compact
            onClick={onOpenCalendar}
          />
        ) : null}

        {snapshot.rebalanceActions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {snapshot.rebalanceActions.map((action) => (
              <AuxSeedButton
                key={action.id}
                label={action.label}
                onClick={() => onRebalancePrompt?.(action.prompt)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
