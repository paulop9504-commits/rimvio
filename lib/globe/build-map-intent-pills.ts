import { copy } from "@/lib/copy/human-ko";
import type { GlobeChatActionHintPill } from "@/lib/portal/compose-draft/build-globe-chat-action-hint";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";

/** Map prompt starter pills — personal vs discovery. */
export function buildMapIntentPills(layerMode: GlobeLayerMode): readonly GlobeChatActionHintPill[] {
  return layerMode === "discovery"
    ? copy.globe.discoveryIntentPills
    : copy.globe.mapIntentPills;
}
