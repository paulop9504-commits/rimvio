import type { EntityKind } from "@/lib/entity-resolver/types";
import type { WorldGeoEntityId } from "@/lib/reality-graph/types";

/** Shared dictionary row — Dictionary-first NER. */
export type EntityCatalogEntry = {
  readonly id: string;
  readonly labelKo: string;
  readonly queryKo: string;
  readonly kind: EntityKind;
  readonly pattern: RegExp;
  readonly aliases: readonly string[];
  readonly semanticPath: readonly string[];
  readonly confidence?: number;
  readonly geoId?: WorldGeoEntityId;
};
