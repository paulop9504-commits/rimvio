"use client";

/**
 * WorkspaceMapCompareOverlay — DecisionProjection → Floating Decision Callout
 * + Compare Relationship Edge Layer (Object → Relationship → Decision).
 *
 * Pipeline (no new map math):
 *   DecisionProjection[] → Entity Anchor (pin projection engine) → Screen → Callout
 */

import {
  DecisionCallout,
  DECISION_CALLOUT_WIDTH,
} from "@/components/context-workspace/decision-callout";
import { CompareRelationshipEdgeLayer } from "@/components/context-workspace/compare-relationship-edge-layer";
import type { CompareRelationshipEdge } from "@/lib/context-workspace/projection/build-compare-relationship-edges";
import {
  fromCompareDecisionRelationship,
} from "@/lib/context-workspace/projection/build-compare-relationship-edges";
import type { DecisionProjection } from "@/lib/context-workspace/projection/types";
import type { CompareDecisionRelationship } from "@/lib/context-workspace/projection/types";
import { cn } from "@/lib/utils";

export type EntityId = string;

export type ScreenPosition = {
  readonly x: number;
  readonly y: number;
};

export type WorkspaceMapCompareOverlayProps = {
  readonly decisions: readonly DecisionProjection[];
  /** Pin projection engine output — do not recompute map coords here. */
  readonly anchors: Readonly<Record<EntityId, ScreenPosition>>;
  readonly selectedEntityId?: string | null;
  readonly onSelect?: (entityId: string) => void;
  /**
   * Compare Relationship edges — Compare Mode only.
   * Prefer Workspace SSOT edges; falls back to decision.relationships.
   */
  readonly relationshipEdges?: readonly CompareRelationshipEdge[] | null;
  readonly entityTitles?: Readonly<Record<string, string>> | null;
  readonly className?: string;
};

const CARD_H_EST = 168;

function edgesFromDecisions(
  decisions: readonly DecisionProjection[],
): CompareRelationshipEdge[] {
  const seen = new Set<string>();
  const out: CompareRelationshipEdge[] = [];
  for (const d of decisions) {
    for (const rel of d.relationships) {
      if (seen.has(rel.id)) continue;
      seen.add(rel.id);
      out.push(fromCompareDecisionRelationship(rel));
    }
  }
  return out;
}

/**
 * Map overlay: Decision Callouts + Relationship edges at pin-projected anchors.
 */
export function WorkspaceMapCompareOverlay({
  decisions,
  anchors,
  selectedEntityId = null,
  onSelect,
  relationshipEdges = null,
  entityTitles = null,
  className,
}: WorkspaceMapCompareOverlayProps) {
  if (decisions.length === 0) return null;

  const edges =
    relationshipEdges && relationshipEdges.length > 0
      ? relationshipEdges
      : edgesFromDecisions(decisions);

  const titles: Record<string, string> = { ...(entityTitles ?? {}) };
  for (const d of decisions) {
    if (!titles[d.entityId]) titles[d.entityId] = d.titleKo;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[6] overflow-hidden",
        className,
      )}
      data-workspace-map-compare-overlay
      data-decision-count={decisions.length}
    >
      <CompareRelationshipEdgeLayer
        active
        edges={edges}
        anchors={anchors}
        titles={titles}
      />

      {decisions.map((decision, index) => {
        const anchor = anchors[decision.entityId];
        if (!anchor) return null;
        const selected = selectedEntityId === decision.entityId;
        const stagger = (index % 3) * 8;
        const left = Math.max(
          8,
          anchor.x - DECISION_CALLOUT_WIDTH / 2 + stagger,
        );
        const top = Math.max(8, anchor.y - CARD_H_EST - stagger);
        return (
          <DecisionCallout
            key={decision.entityId}
            decision={decision}
            selected={selected}
            onSelect={onSelect}
            style={{
              position: "absolute",
              left,
              top,
              zIndex: selected ? 20 : 10 + index,
            }}
          />
        );
      })}
    </div>
  );
}

/** @deprecated Prefer CompareRelationshipEdge via buildCompareRelationshipEdges */
export type { CompareDecisionRelationship };
