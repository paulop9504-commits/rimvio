"use client";

import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import type { CapabilityId } from "@/lib/capability-registry";
import { SurfaceCard } from "@/components/surface/surface-card";
import { cn } from "@/lib/utils";

export type SurfaceFeedStripProps = {
  surfaces: readonly RankedSurface[];
  onDispatchCapability: (
    surface: RankedSurface,
    actionId: string,
    capabilityId: CapabilityId,
  ) => void;
  className?: string;
};

/** FEED channel — render surfaces only. */
export function SurfaceFeedStrip({
  surfaces,
  onDispatchCapability,
  className,
}: SurfaceFeedStripProps) {
  if (surfaces.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3 px-3 py-2", className)} aria-label="Situation surfaces">
      {surfaces.map((surface) => (
        <SurfaceCard
          key={surface.id}
          surface={surface}
          onPrimary={() =>
            onDispatchCapability(
              surface,
              surface.primaryAction.id,
              surface.primaryAction.capabilityId,
            )
          }
          onSecondary={(actionId) => {
            const action = surface.secondaryActions.find((row) => row.id === actionId);
            if (action) {
              onDispatchCapability(surface, action.id, action.capabilityId);
            }
          }}
        />
      ))}
    </div>
  );
}
