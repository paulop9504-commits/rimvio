"use client";

import { copy } from "@/lib/copy/human-ko";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { cn } from "@/lib/utils";

export type GlobeLayerModeToggleProps = {
  mode: GlobeLayerMode;
  onModeChange: (mode: GlobeLayerMode) => void;
  /** map = dark glass on globe · sheet = light pill · sheet-dark = dark ask sheet */
  variant?: "map" | "sheet" | "sheet-dark";
  className?: string;
};

const MODES: GlobeLayerMode[] = ["personal", "discovery"];

export function GlobeLayerModeToggle({
  mode,
  onModeChange,
  variant = "map",
  className,
}: GlobeLayerModeToggleProps) {
  const sheet = variant === "sheet";
  const sheetDark = variant === "sheet-dark";
  return (
    <div
      className={cn(
        "flex rounded-full p-0.5",
        sheetDark
          ? "bg-[#0a0f18]/72 shadow-lg ring-1 ring-white/12 backdrop-blur-xl"
          : sheet
            ? "bg-[#e8eaed]/90 shadow-sm ring-1 ring-black/[0.05]"
            : "bg-[#0a0f18]/80 shadow-lg ring-1 ring-white/15 backdrop-blur-xl",
        className,
      )}
      data-globe-layer-mode-toggle
      role="tablist"
      aria-label={copy.globe.layerModeAria}
    >
      {MODES.map((value) => {
        const active = mode === value;
        const label =
          value === "personal"
            ? copy.globe.layerModePersonal
            : copy.globe.layerModeDiscovery;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            data-globe-layer-mode={value}
            className={cn(
              "min-w-[4.5rem] rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              active
                ? value === "personal"
                  ? "bg-[#ff6b4a] text-white shadow-sm"
                  : sheet
                    ? "bg-white text-[#191f28] shadow-sm ring-1 ring-black/[0.04]"
                    : "bg-white text-[#0a0f18] shadow-sm"
                : sheetDark
                  ? "text-white/50 hover:text-white/75"
                  : sheet
                    ? "text-[#8b95a1] hover:text-[#4e5968]"
                    : "text-white/65 hover:text-white",
            )}
            onClick={() => {
              if (!active) {
                onModeChange(value);
              }
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
