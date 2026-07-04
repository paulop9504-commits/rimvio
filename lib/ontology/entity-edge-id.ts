import type { EntityEdgeKind } from "@/lib/ontology/edge-types";
import type { RimvioEntityId } from "@/lib/ontology/entity-types";

export function entityEdgeId(
  kind: EntityEdgeKind,
  fromEntityId: RimvioEntityId,
  toEntityId: RimvioEntityId,
): string {
  const pair = [fromEntityId, toEntityId].sort();
  return `${kind}:${pair[0]}↔${pair[1]}`;
}
