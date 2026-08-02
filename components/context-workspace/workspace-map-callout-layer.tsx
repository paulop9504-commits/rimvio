"use client";

/**
 * Interaction Layer — multiple CalloutFloatingWindows over the map.
 * Shell is pointer-events-none; each window card captures its own events.
 */

import { CalloutFloatingWindow } from "@/components/context-workspace/callout-floating-window";
import type { CalloutSessionValue } from "@/lib/callout/callout-session";
import {
  closeCalloutWindow,
  type CalloutWindow,
} from "@/lib/callout/windows";
import { cn } from "@/lib/utils";

export type WorkspaceMapCalloutLayerItem = {
  readonly window: CalloutWindow;
  readonly session: CalloutSessionValue;
  readonly title: string;
  readonly subtitleKo?: string | null;
  readonly anchor: { readonly x: number; readonly y: number } | null;
};

export type WorkspaceMapCalloutLayerProps = {
  readonly items: readonly WorkspaceMapCalloutLayerItem[];
  readonly onRequestWorkspace?: (entityId: string) => void;
  readonly className?: string;
};

export function WorkspaceMapCalloutLayer({
  items,
  onRequestWorkspace,
  className,
}: WorkspaceMapCalloutLayerProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[5] overflow-hidden",
        className,
      )}
      data-workspace-map-callout-layer
    >
      {items.map((item) => (
        <CalloutFloatingWindow
          key={item.window.id}
          window={item.window}
          session={item.session}
          title={item.title}
          subtitleKo={item.subtitleKo}
          anchor={item.anchor}
          onClose={closeCalloutWindow}
          onRequestWorkspace={onRequestWorkspace}
        />
      ))}
    </div>
  );
}
