"use client";

import {
  getTrendBridgeFeature,
  listTrendBridgeHudFeatures,
} from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeTrendBridgePulseChipProps = {
  enabled: boolean;
  activeBridgeId: string | null;
  pulseIntent?: "align" | "avoid";
  onToggle: (enabled: boolean) => void;
  onBridgeSelect: (bridgeId: string) => void;
  onPulseIntentChange?: (intent: "align" | "avoid") => void;
  className?: string;
};

/** 내 지구 전용 — 동네 흐름(Pulse) 옵션 칩. 내/밖 지구 토글과 분리. */
export function GlobeTrendBridgePulseChip({
  enabled,
  activeBridgeId,
  pulseIntent = "align",
  onToggle,
  onBridgeSelect,
  onPulseIntentChange,
  className,
}: GlobeTrendBridgePulseChipProps) {
  const chips = listTrendBridgeHudFeatures();
  const active = activeBridgeId ? getTrendBridgeFeature(activeBridgeId) : null;

  return (
    <div
      className={cn(
        "max-w-[min(100vw-1.5rem,20rem)] rounded-2xl bg-black/45 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur-md",
        className,
      )}
      data-globe-trend-bridge-pulse-chip
      data-globe-trend-bridge-enabled={enabled ? "true" : "false"}
      data-globe-trend-bridge-active={activeBridgeId ?? ""}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors",
          enabled ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/16",
        )}
        aria-pressed={enabled}
        onClick={() => onToggle(!enabled)}
      >
        <span className="text-[12px] font-semibold">
          {enabled && active
            ? copy.globe.trendBridgeLayerBadge(active.displayName)
            : copy.globe.trendBridgePulseChipLabel}
        </span>
        <span className="text-[10px] font-medium opacity-70">
          {enabled ? copy.globe.trendBridgePulseChipOn : copy.globe.trendBridgePulseChipOff}
        </span>
      </button>

      {enabled ? (
        <>
          <p className="mb-1.5 mt-2 px-0.5 text-[11px] leading-snug text-white/75">
            {active
              ? copy.globe.trendBridgeActiveHint(active.displayName)
              : copy.globe.trendBridgePickHint}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((feature) => {
              const selected = feature.bridgeId === activeBridgeId;
              const token = feature.aliases[0] ?? feature.displayName;
              return (
                <button
                  key={feature.bridgeId}
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/12 text-white hover:bg-white/20",
                  )}
                  data-globe-trend-bridge-chip={feature.bridgeId}
                  onClick={() => onBridgeSelect(feature.bridgeId)}
                >
                  @{token}
                </button>
              );
            })}
          </div>
          {onPulseIntentChange ? (
            <div
              className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-0.5"
              role="tablist"
              aria-label={copy.globe.pulseIntentAria}
            >
              <button
                type="button"
                role="tab"
                aria-selected={pulseIntent === "align"}
                className={cn(
                  "rounded-[0.65rem] px-2 py-1 text-[11px] font-semibold transition-colors",
                  pulseIntent === "align"
                    ? "bg-white text-foreground"
                    : "text-white/80 hover:text-white",
                )}
                onClick={() => onPulseIntentChange("align")}
              >
                {copy.globe.pulseIntentAlign}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pulseIntent === "avoid"}
                className={cn(
                  "rounded-[0.65rem] px-2 py-1 text-[11px] font-semibold transition-colors",
                  pulseIntent === "avoid"
                    ? "bg-white text-foreground"
                    : "text-white/80 hover:text-white",
                )}
                onClick={() => onPulseIntentChange("avoid")}
              >
                {copy.globe.pulseIntentAvoid}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
