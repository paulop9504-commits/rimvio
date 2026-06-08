"use client";

import { CalendarPlus } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useCalendarGoogleActions } from "@/hooks/use-calendar-google-actions";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

type CalendarGoogleConnectBannerProps = {
  className?: string;
  onConnected?: () => void;
};

export function CalendarGoogleConnectBanner({
  className,
  onConnected,
}: CalendarGoogleConnectBannerProps) {
  const copy = useCopy();
  const { available, connected, connectGoogle } = useCalendarGoogleActions();

  if (!available || connected) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#4285F4]/25 bg-[#4285F4]/10 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#4285F4]/20 text-[#93C5FD]">
          <CalendarPlus className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground">
            {copy.calendar.connectBannerTitle}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {copy.calendar.connectBannerBody}
          </p>
          <button
            type="button"
            onClick={() => {
              onConnected?.();
              connectGoogle();
            }}
            className={cn(
              "mt-3 h-10 w-full text-[13px] font-semibold",
              IOS.primaryBtn,
            )}
          >
            {copy.calendar.connectGoogle}
          </button>
        </div>
      </div>
    </div>
  );
}
