"use client";

import { copy } from "@/lib/copy/human-ko";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { cn } from "@/lib/utils";

export type GlobeLayerModeToggleProps = {
  mode: GlobeLayerMode;
  onModeChange: (mode: GlobeLayerMode) => void;
  className?: string;
};

const MODES: GlobeLayerMode[] = ["personal", "discovery"];

export function GlobeLayerModeToggle({
  mode,
  onModeChange,
  className,
}: GlobeLayerModeToggleProps) {
  return (
    <div
      className={cn(
        "flex rounded-full bg-card/95 p-0.5 shadow-sm ring-1 ring-border backdrop-blur-md",
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
              "min-w-[4.25rem] rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
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
