"use client";

/**
 * Reality Map Layer — hosts WorkspaceMapView + Entity Callout overlay.
 * Map stays 70–80% of the Mobile Workspace canvas.
 */

import { WorkspaceMapView } from "@/components/context-workspace/workspace-map-view";
import type { WorkspaceMapPin } from "@/lib/context-workspace/map/workspace-map-provider";
import { CompactCallout } from "@/components/mobile-workspace/CompactCallout";
import { cn } from "@/lib/utils";
import type { MobileWorkspaceEntity } from "@/lib/mobile-workspace";

export type RealityMapProps = {
  readonly pins: readonly WorkspaceMapPin[];
  readonly selectedId?: string | null;
  readonly compactEntity?: MobileWorkspaceEntity | null;
  readonly showCompactCallout?: boolean;
  readonly preferredCenter?: { readonly lat: number; readonly lng: number } | null;
  readonly contextEventId?: string | null;
  readonly routeLineCoords?: readonly [number, number][];
  readonly onSelectPin?: (id: string) => void;
  readonly onPinLongPress?: (id: string) => void;
  readonly onOpenWorkspace?: (id: string) => void;
  readonly onExpandCompact?: () => void;
  readonly onCloseCompact?: () => void;
  readonly className?: string;
};

export function RealityMap({
  pins,
  selectedId = null,
  compactEntity = null,
  showCompactCallout = false,
  preferredCenter = null,
  contextEventId = null,
  routeLineCoords,
  onSelectPin,
  onPinLongPress,
  onOpenWorkspace,
  onExpandCompact,
  onCloseCompact,
  className,
}: RealityMapProps) {
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      data-mobile-reality-map
    >
      <WorkspaceMapView
        pins={pins}
        selectedId={selectedId}
        onSelectPin={onSelectPin}
        onPinLongPress={onPinLongPress}
        onOpenWorkspace={onOpenWorkspace}
        preferredCenter={preferredCenter}
        contextEventId={contextEventId}
        routeLineCoords={routeLineCoords}
        floatingCallouts={null}
        objectCallout={null}
        compact
      />
      {showCompactCallout && compactEntity ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[7.5rem] z-[8] flex justify-center px-3">
          <CompactCallout
            entity={compactEntity}
            onExpand={onExpandCompact}
            onClose={onCloseCompact}
            onLongPress={() => onPinLongPress?.(compactEntity.id)}
          />
        </div>
      ) : null}
    </div>
  );
}
