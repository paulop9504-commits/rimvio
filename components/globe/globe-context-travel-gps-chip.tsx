"use client";

import { MapPin } from "lucide-react";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextTravelGpsChipProps = {
  onApplyGps: () => void;
  busy?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

/** Travel slot collect — offer GPS before typing origin. */
export function GlobeContextTravelGpsChip({
  onApplyGps,
  busy = false,
  tone = "light",
  className,
}: GlobeContextTravelGpsChipProps) {
  const { enabled, setEnabled } = useGpsTrackingEnabled();

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!enabled) {
          setEnabled(true);
        }
        onApplyGps();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-full px-3 py-2 text-left active:scale-[0.98]",
        tone === "dark"
          ? "bg-[#3182f6]/20 text-white ring-1 ring-[#3182f6]/40"
          : "bg-[#e8f0fe] text-[#1a4fad] ring-1 ring-[#007aff]/25",
        className,
      )}
      aria-label={copy.globe.travelContext.gpsEnableAria}
      data-globe-travel-gps-chip
      data-globe-gps-enabled={enabled ? "true" : "false"}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/15">
        <MapPin className="size-4" aria-hidden />
      </span>
      <span className="text-[12px] font-semibold">{copy.globe.travelContext.gpsEnableCta}</span>
    </button>
  );
}
