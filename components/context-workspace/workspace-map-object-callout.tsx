"use client";

/**
 * Object Callout anchored to a Workspace map pin (screen projection).
 * Control Surface — not a capability chip bloom.
 */

import { Callout } from "@/lib/callout/Callout";
import {
  CalloutSessionProvider,
  type CalloutSessionValue,
} from "@/lib/callout/callout-session";
import { cn } from "@/lib/utils";

export type WorkspaceMapObjectCalloutProps = {
  open: boolean;
  objectId: string;
  session: CalloutSessionValue;
  /** CSS pixel position relative to map container (from map.project). */
  anchor: { readonly x: number; readonly y: number } | null;
  className?: string;
};

export function WorkspaceMapObjectCallout({
  open,
  objectId,
  session,
  anchor,
  className,
}: WorkspaceMapObjectCalloutProps) {
  if (!open || !anchor || !objectId) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[5] w-[min(94vw,360px)] -translate-x-1/2",
        className,
      )}
      style={{
        left: anchor.x,
        top: anchor.y,
        transform: "translate(-50%, calc(-100% - 12px))",
      }}
      data-workspace-map-object-callout
    >
      <div className="pointer-events-auto rounded-[22px] bg-white/96 p-3 shadow-[0_12px_40px_rgba(25,31,40,0.18)] ring-1 ring-black/[0.05] backdrop-blur-md">
        <CalloutSessionProvider value={session}>
          <Callout objectId={objectId} compact />
        </CalloutSessionProvider>
      </div>
    </div>
  );
}
