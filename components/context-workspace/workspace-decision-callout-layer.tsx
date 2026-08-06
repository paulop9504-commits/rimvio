"use client";

/**
 * @deprecated Prefer WorkspaceMapCompareOverlay.
 * Thin adapter kept so older imports keep working.
 */

import {
  WorkspaceMapCompareOverlay,
  type ScreenPosition,
} from "@/components/context-workspace/workspace-map-compare-overlay";
import type { DecisionProjection } from "@/lib/context-workspace/projection/types";

export type WorkspaceDecisionCalloutLayerProps = {
  readonly decisions: readonly DecisionProjection[];
  readonly anchorsByEntityId: Readonly<Record<string, ScreenPosition>>;
  readonly selectedEntityId?: string | null;
  /** @deprecated Overlay collects edges from decision.relationships */
  readonly relationships?: readonly unknown[];
  readonly onSelect: (entityId: string) => void;
  readonly className?: string;
};

/** @deprecated Use WorkspaceMapCompareOverlay (anchors from pin projection engine). */
export function WorkspaceDecisionCalloutLayer({
  decisions,
  anchorsByEntityId,
  selectedEntityId = null,
  onSelect,
  className,
}: WorkspaceDecisionCalloutLayerProps) {
  return (
    <WorkspaceMapCompareOverlay
      decisions={decisions}
      anchors={anchorsByEntityId}
      selectedEntityId={selectedEntityId}
      onSelect={onSelect}
      className={className}
    />
  );
}
