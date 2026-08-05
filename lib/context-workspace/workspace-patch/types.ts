/**
 * Workspace Patch SSOT — Workspace stores Patches, never Answers.
 * Mutations are Patch-unit only (ADR-022).
 */

export const WORKSPACE_PATCH_KINDS = [
  "create_entity",
  "delete_entity",
  "update_entity",
  "filter_entity",
  "move_entity",
  "connect_entity",
  "disconnect_entity",
  "create_draft",
  "simulation",
  /** Replace candidates (e.g. "더 싼 호텔") */
  "replace_entity",
  /** Move item onto a schedule day (e.g. "Day2로 옮겨") */
  "move_schedule",
  /** Spatial constraint on plan (e.g. "난바역 근처") */
  "spatial_constraint",
  /** ADR-051 Reality absorb (rail / event / amenity network) */
  "absorb_network",
  /** ADR-051 place footprint (castle grounds / OSM polygon glow) */
  "absorb_geometry",
] as const;

export type WorkspacePatchKind = (typeof WORKSPACE_PATCH_KINDS)[number];

export type WorkspacePatch =
  | {
      readonly kind: "create_entity";
      readonly entityIds?: readonly string[];
      readonly domain?: "lodging" | "eatery" | "poi" | "amenity";
      readonly query?: string;
    }
  | {
      readonly kind: "delete_entity";
      readonly entityIds: readonly string[];
    }
  | {
      readonly kind: "update_entity";
      readonly entityId: string;
      readonly fields: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: "filter_entity";
      readonly filter: {
        readonly maxPriceBand?: number | null;
        readonly minRating?: number | null;
        readonly tagIncludes?: readonly string[] | null;
        readonly queryIncludes?: string | null;
      };
    }
  | {
      readonly kind: "move_entity";
      readonly entityId: string;
      readonly lat?: number;
      readonly lng?: number;
    }
  | {
      readonly kind: "connect_entity";
      readonly fromId: string;
      readonly toId: string;
      readonly relation?: "nearby" | "compare" | "route";
      readonly labelKo?: string;
      readonly meters?: number | null;
    }
  | {
      readonly kind: "disconnect_entity";
      readonly fromId: string;
      readonly toId: string;
    }
  | {
      readonly kind: "create_draft";
      readonly labelKo?: string;
    }
  | {
      readonly kind: "simulation";
      readonly scenarioKo?: string;
    }
  | {
      readonly kind: "replace_entity";
      readonly domain?: "lodging" | "eatery" | "poi" | "amenity";
      readonly cheaper?: boolean;
      readonly stayType?: string | null;
      readonly query?: string;
    }
  | {
      readonly kind: "move_schedule";
      readonly entityId?: string | null;
      /** 0-based ordinal from 「2번」 when entityId not yet known */
      readonly ordinalIndex?: number | null;
      readonly dayIndex: number;
    }
  | {
      readonly kind: "spatial_constraint";
      readonly nearLabelKo: string;
      readonly stationNear?: boolean;
      readonly meters?: number | null;
    }
  | {
      readonly kind: "absorb_network";
      readonly needId: string;
      readonly providerId: string;
      readonly lineCount: number;
      readonly stationCount: number;
      /** Materialized visibility — Workspace Reality Projection SSOT */
      readonly family?: import("@/lib/reality-provider/network-absorb-projection").NetworkAbsorbFamily;
      readonly visibility?: "show" | "hide";
      readonly visibilityOp?: import("@/lib/reality-provider/network-absorb-projection").NetworkAbsorbVisibilityOp;
      readonly lineIds?: readonly string[];
      readonly labelKo?: string;
    }
  | {
      readonly kind: "absorb_geometry";
      readonly needId: string;
      readonly providerId: string;
      readonly geoId: string;
      readonly geometryType: "Polygon" | "MultiPolygon";
      readonly labelKo: string;
    };

/** Append-only Patch log entry — the only mutation record Workspace keeps. */
export type WorkspacePatchRecord = {
  readonly id: string;
  readonly kind: WorkspacePatchKind;
  readonly patch: WorkspacePatch;
  readonly utterance: string | null;
  readonly statusKo: string;
  readonly atIso: string;
  /** Never store essay answers here. */
  readonly answerForbidden: true;
};
