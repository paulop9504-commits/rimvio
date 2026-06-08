"use client";

import Link from "next/link";
import { Maximize2, RefreshCw, Settings2 } from "lucide-react";
import { CalendarScheduleOriginBadge } from "@/components/action-chat/calendar-schedule-origin-badge";
import { useCopy } from "@/hooks/use-copy";
import { useCalendarGoogleActions } from "@/hooks/use-calendar-google-actions";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

type CalendarToolbarProps = {
  variant?: "page" | "sheet" | "compact";
  showLegend?: boolean;
  showFullScreenLink?: boolean;
  onOpenFullScreen?: () => void;
  className?: string;
};

export function CalendarToolbar({
  variant = "page",
  showLegend = true,
  showFullScreenLink = false,
  onOpenFullScreen,
  className,
}: CalendarToolbarProps) {
  const copy = useCopy();
  const {
    available,
    connected,
    syncing,
    runSync,
    connectGoogle,
    openFullCalendar,
  } = useCalendarGoogleActions();

  const compact = variant === "compact";

  return (
    <div className={cn("space-y-2", className)}>
      {showLegend ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground",
            compact && "text-[9px]",
          )}
        >
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex size-3 rounded-sm bg-[#0D9488]" aria-hidden />
            <CalendarScheduleOriginBadge origin="rimvio" size="xs" />
            <span>{copy.calendar.originRimvio}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-flex size-3 rounded-sm border border-[#4285F4]/60 bg-[#4285F4]/15"
              aria-hidden
            />
            <CalendarScheduleOriginBadge origin="google_calendar" size="xs" />
            <span>{copy.calendar.originGoogle}</span>
          </span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        {variant === "page" ? (
          <p className="min-w-0 text-[12px] leading-snug text-muted-foreground sm:text-[13px]">
            {copy.calendar.pageHint}
          </p>
        ) : (
          <span className="sr-only">{copy.nav.calendar}</span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {showFullScreenLink ? (
            <button
              type="button"
              onClick={() => {
                onOpenFullScreen?.();
                openFullCalendar();
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                IOS.secondaryBtn,
              )}
            >
              <Maximize2 className="size-3.5" />
              {copy.calendar.fullScreen}
            </button>
          ) : null}

          {connected ? (
            <button
              type="button"
              disabled={syncing}
              onClick={() => void runSync()}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                IOS.primaryBtn,
                "h-auto min-h-0 w-auto py-2",
              )}
            >
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? copy.calendar.syncing : copy.calendar.syncShort}
            </button>
          ) : available ? (
            <button
              type="button"
              onClick={connectGoogle}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                IOS.primaryBtn,
                "h-auto min-h-0 w-auto py-2",
              )}
            >
              {copy.calendar.connectGoogle}
            </button>
          ) : null}

          <Link
            href="/welcome#integrations"
            aria-label={copy.calendar.integrations}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
              IOS.secondaryBtn,
            )}
          >
            <Settings2 className="size-3.5" />
            {compact ? null : copy.calendar.integrations}
          </Link>
        </div>
      </div>
    </div>
  );
}
