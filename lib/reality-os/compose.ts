/**
 * Compose Reality primitives for a Context — labels (travel…) are convenience only.
 * @see docs/adr/034-reality-os-primitives-projection.md
 */

import type { WorkspaceMorphologyId } from "@/lib/workspace-morphology";
import type { WorkspaceSdkKind } from "@/lib/workspace-sdk/types";
import type { RealityPrimitiveId } from "@/lib/reality-os/primitives";
import { REALITY_PRIMITIVE_DEFS } from "@/lib/reality-os/primitives";

export type RealityComposition = {
  readonly version: 1;
  /** Convenience label — not the OS identity. */
  readonly labelKind: WorkspaceSdkKind;
  readonly primitives: readonly RealityPrimitiveId[];
  /** Default morphology projection of this composition (ADR-033). */
  readonly defaultMorphologyId: WorkspaceMorphologyId;
  readonly coreQuestionKo: string;
};

const LIVE_COMPOSITIONS: Readonly<
  Record<WorkspaceSdkKind, RealityComposition>
> = {
  travel: {
    version: 1,
    labelKind: "travel",
    primitives: ["spatial", "timeline", "transaction", "recommendation"],
    defaultMorphologyId: "spatial_timeline",
    coreQuestionKo: "어디에 있는가 · 언제인가",
  },
  used_goods: {
    version: 1,
    labelKind: "used_goods",
    primitives: ["object", "pipeline", "communication", "transaction"],
    defaultMorphologyId: "card_pipeline",
    coreQuestionKo: "거래가 어디까지 왔는가",
  },
  driver: {
    version: 1,
    labelKind: "driver",
    primitives: ["spatial", "dashboard", "timeline"],
    defaultMorphologyId: "vehicle_dashboard",
    coreQuestionKo: "지금 어디로 가는가",
  },
};

export function composeRealityForSdkKind(
  kind: WorkspaceSdkKind,
): RealityComposition {
  return LIVE_COMPOSITIONS[kind];
}

export function listCompositionPrimitives(
  composition: RealityComposition,
): readonly { id: RealityPrimitiveId; labelKo: string }[] {
  return composition.primitives.map((id) => ({
    id,
    labelKo: REALITY_PRIMITIVE_DEFS[id].labelKo,
  }));
}
