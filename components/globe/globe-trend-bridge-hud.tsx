"use client";

import {
  getTrendBridgeFeature,
  listTrendBridgeHudFeatures,
} from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeTrendBridgeHudProps = {
  enabled: boolean;
  activeBridgeId: string | null;
  pulseIntent?: "align" | "avoid";
  honorific?: string;
  onModeChange: (enabled: boolean) => void;
  onBridgeSelect: (bridgeId: string) => void;
  onPulseIntentChange?: (intent: "align" | "avoid") => void;
  className?: string;
};

/** Globe overlay — 내 흔적 vs 동네 맥락 + @ feature chips. */
export function GlobeTrendBridgeHud({
  enabled,
  activeBridgeId,
  pulseIntent = "align",
  honorific = "당신",
  onModeChange,
  onBridgeSelect,
  onPulseIntentChange,
  className,
}: GlobeTrendBridgeHudProps) {
  const chips = listTrendBridgeHudFeatures();
  const active = activeBridgeId ? getTrendBridgeFeature(activeBridgeId) : null;

  return (
    <div
      className={cn(
        "max-w-[min(100vw-1.5rem,20rem)] rounded-2xl bg-black/45 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur-md",
        className,
      )}
      data-globe-trend-bridge-hud
      data-globe-trend-bridge-enabled={enabled ? "true" : "false"}
      data-globe-trend-bridge-active={activeBridgeId ?? ""}
    >
      <div
        className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-0.5"
        role="tablist"
        aria-label={copy.globe.trendBridgeModeAria}
      >
        <button
          type="button"
          role="tab"
          aria-selected={!enabled}
          className={cn(
            "rounded-[0.65rem] px-2 py-1.5 text-[12px] font-semibold transition-colors",
            !enabled
              ? "bg-white text-foreground"
              : "text-white/80 hover:text-white",
          )}
          onClick={() => onModeChange(false)}
        >
          {copy.globe.trendBridgeModePersonal}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={enabled}
          className={cn(
            "rounded-[0.65rem] px-2 py-1.5 text-[12px] font-semibold transition-colors",
            enabled
              ? "bg-white text-foreground"
              : "text-white/80 hover:text-white",
          )}
          onClick={() => onModeChange(true)}
        >
          {copy.globe.trendBridgeModeContext}
        </button>
      </div>

      {enabled ? (
        <>
          <p className="mb-1.5 px-0.5 text-[11px] leading-snug text-white/75">
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
      ) : (
        <p className="px-0.5 text-[11px] leading-snug text-white/75">
          {copy.globe.memoriesMapInvite(honorific)}
        </p>
      )}
    </div>
  );
}
