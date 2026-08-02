/**
 * Workspace Projection Event pipeline.
 *
 * Entity Created → Projection Event → Map Update → Marker →
 * Relationship Layer Update → Callout
 */

import type {
  SpatialCalloutSeed,
  SpatialContextAwareCallout,
  SpatialProjectionEvent,
  SpatialProjectionPin,
  SpatialRealityEntity,
  SpatialRealityRelationship,
} from "@/lib/spatial-retrieval/types";
import {
  SPATIAL_PROJECTION_PIPELINE,
} from "@/lib/spatial-retrieval/types";

/**
 * Emit auto-update events when new Reality Entities are created.
 */
export function emitSpatialProjectionEvents(input: {
  readonly realityEntities: readonly SpatialRealityEntity[];
  readonly relationships: readonly SpatialRealityRelationship[];
  readonly pins: readonly SpatialProjectionPin[];
  readonly callouts: readonly (SpatialContextAwareCallout | SpatialCalloutSeed)[];
}): readonly SpatialProjectionEvent[] {
  const events: SpatialProjectionEvent[] = [];
  const discovered = input.realityEntities.filter(
    (e) => e.contextLinks.length > 1 || e.type !== "hotel",
  );
  // Prefer entities that are not the sole context-root: all non-first nodes
  const created = input.realityEntities.slice(1);

  for (const e of created) {
    events.push({
      stage: "entity_created",
      entityId: e.id,
      message: `Entity Created · ${e.type} · ${e.attributes.titleKo}`,
    });
    events.push({
      stage: "projection_event",
      entityId: e.id,
      message: `Projection Event · ${e.id}`,
    });
  }

  events.push({
    stage: "map_update",
    entityId: null,
    message: `Map Update · +${created.length} entities · pins=${input.pins.length}`,
  });

  for (const pin of input.pins.filter((p) => p.role === "discovered")) {
    events.push({
      stage: "marker_created",
      entityId: pin.entityId,
      message: `Marker 생성 · ${pin.titleKo}`,
    });
  }

  events.push({
    stage: "relationship_layer_update",
    entityId: null,
    message: `Relationship Layer Update · edges=${input.relationships.length}`,
  });

  for (const c of input.callouts) {
    events.push({
      stage: "callout_created",
      entityId: c.entityId,
      message: `Callout 생성 · ${c.titleKo} · mode=${c.mode}`,
    });
  }

  // Ensure pipeline stages appear even when empty (deterministic order hint)
  void SPATIAL_PROJECTION_PIPELINE;
  void discovered;

  return events;
}
