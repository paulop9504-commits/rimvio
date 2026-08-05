/**
 * Materialized network absorb projection — Workspace Reality State SSOT.
 * Patch log is append-only history; Map reads this object (via session bridge).
 */

export const NETWORK_ABSORB_FAMILIES = [
  "osaka_jr",
  "osaka_metro",
  "japan_metro",
  "shinkansen",
  "korea_rail",
] as const;

export type NetworkAbsorbFamily = (typeof NETWORK_ABSORB_FAMILIES)[number];

/** How this absorb Patch mutates materialized visibility. */
export type NetworkAbsorbVisibilityOp =
  | "replace" // show_all / show_set
  | "add" // show single line
  | "remove" // hide single line
  | "clear"; // hide_all

export type NetworkAbsorbFamilyState = {
  readonly visibility: "show" | "hide";
  readonly lineIds: readonly string[];
  readonly labelKo: string;
  readonly providerId: string;
  readonly needId: string;
  readonly updatedAtIso: string;
};

/** Materialized Projection State — one slot per overlay family. */
export type NetworkAbsorbProjectionState = {
  readonly version: 1;
  readonly families: Readonly<
    Partial<Record<NetworkAbsorbFamily, NetworkAbsorbFamilyState>>
  >;
};

export type AbsorbNetworkVisibilityPatch = {
  readonly family: NetworkAbsorbFamily;
  readonly op: NetworkAbsorbVisibilityOp;
  readonly lineIds: readonly string[];
  readonly labelKo: string;
  readonly providerId: string;
  readonly needId: string;
  readonly atIso?: string;
};

function emptyProjection(): NetworkAbsorbProjectionState {
  return { version: 1, families: {} };
}

/**
 * Fold an absorb visibility patch into materialized projection.
 */
export function foldAbsorbNetworkVisibility(
  prev: NetworkAbsorbProjectionState | null | undefined,
  patch: AbsorbNetworkVisibilityPatch,
): NetworkAbsorbProjectionState {
  const base = prev?.version === 1 ? prev : emptyProjection();
  const atIso = patch.atIso ?? new Date().toISOString();
  const existing = base.families[patch.family];
  const prevIds = existing?.lineIds ?? [];

  let nextIds: readonly string[];
  switch (patch.op) {
    case "clear":
      nextIds = [];
      break;
    case "replace":
      nextIds = [...patch.lineIds];
      break;
    case "add": {
      const set = new Set([...prevIds, ...patch.lineIds]);
      nextIds = [...set];
      break;
    }
    case "remove": {
      const hide = new Set(patch.lineIds);
      nextIds = prevIds.filter((id) => !hide.has(id));
      break;
    }
    default:
      nextIds = [...patch.lineIds];
  }

  return {
    version: 1,
    families: {
      ...base.families,
      [patch.family]: {
        visibility: nextIds.length > 0 ? "show" : "hide",
        lineIds: nextIds,
        labelKo: patch.labelKo,
        providerId: patch.providerId,
        needId: patch.needId,
        updatedAtIso: atIso,
      },
    },
  };
}

const EMPTY_LINE_IDS: readonly string[] = [];

export function getFamilyVisibleLineIds(
  state: NetworkAbsorbProjectionState | null | undefined,
  family: NetworkAbsorbFamily,
): readonly string[] {
  const slot = state?.families[family];
  if (!slot || slot.visibility === "hide") return EMPTY_LINE_IDS;
  return slot.lineIds;
}
