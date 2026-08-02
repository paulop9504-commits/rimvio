"use client";

/**
 * Capability bloom anchored to a Workspace map pin (screen projection).
 * Object hub on the 2D map — not inside the place sheet.
 */

import type {
  CapabilityLiveSignal,
  WorkspaceCapabilityCallout,
} from "@/lib/context-workspace/capability-callout";
import { WorkspaceCapabilityBloom } from "@/components/context-workspace/workspace-capability-bloom";
import { cn } from "@/lib/utils";

export type WorkspaceMapCapabilityBloomProps = {
  open: boolean;
  /** CSS pixel position relative to map container (from map.project). */
  anchor: { readonly x: number; readonly y: number } | null;
  callouts: readonly WorkspaceCapabilityCallout[];
  liveSignals?: readonly CapabilityLiveSignal[];
  hubLabelKo: string;
  onAction?: () => void;
  className?: string;
};

export function WorkspaceMapCapabilityBloom({
  open,
  anchor,
  callouts,
  liveSignals = [],
  hubLabelKo,
  onAction,
  className,
}: WorkspaceMapCapabilityBloomProps) {
  if (!open || !anchor) return null;
  if (callouts.length === 0 && liveSignals.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[5] w-[min(92vw,340px)] -translate-x-1/2",
        className,
      )}
      style={{
        left: anchor.x,
        top: anchor.y,
        transform: "translate(-50%, calc(-100% - 12px))",
      }}
      data-workspace-map-capability-bloom
    >
      <div className="pointer-events-auto rounded-[22px] bg-white/96 p-2.5 shadow-[0_12px_40px_rgba(25,31,40,0.18)] ring-1 ring-black/[0.05] backdrop-blur-md">
        <WorkspaceCapabilityBloom
          callouts={callouts}
          liveSignals={liveSignals}
          hubLabelKo={hubLabelKo}
          onAction={onAction}
          compact
        />
      </div>
    </div>
  );
}
