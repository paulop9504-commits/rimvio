/**
 * Personal Globe Prompt that should route to Reality Workspace Agent
 * (Patch / Scout / Spatial) — not portal converse or ask-essay.
 */

import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";
import { parseWorkspaceRealityPatch } from "@/lib/context-workspace/workspace-reality-patch";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import { isSpatialDiscoveryUtterance } from "@/lib/spatial-retrieval/apply-spatial-discovery-to-workspace";
import { isCompoundActionUtterance } from "@/lib/action-planner";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";

const LODGING_FIND_RE =
  /(?:호텔|숙소|캡슐|료칸|게스트|모텔).*(?:찾아|보여|검색|바꿔|다시)|(?:찾아|보여|검색).*(?:호텔|숙소)|더\s*싸|가성비|저렴|역\s*근처|온천/iu;

const EATERY_FIND_RE =
  /(?:맛집|식당|카페|먹을\s*곳).*(?:찾아|보여|검색)|(?:찾아|보여|검색).*(?:맛집|식당|카페)/iu;

/**
 * True when utterance is Workspace Agent work — clear/soft Patch or discovery.
 * New-trip Globe Ingress create stays on `globe_ingress` (not Agent mint).
 */
export function isWorkspaceAgentWorkUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  // 「4박5일 오사카 일정」→ Continuum Day skeleton via globe_ingress.
  if (isNewTripGlobeIngressUtterance(text)) return false;
  if (parseWorkspacePatch(text)) return true;
  if (parseWorkspaceRealityPatch(text)) return true;
  if (parseLodgingStayTypeFromText(text)) return true;
  if (isSpatialDiscoveryUtterance(text)) return true;
  if (isCompoundActionUtterance(text)) return true;
  if (LODGING_FIND_RE.test(text) || EATERY_FIND_RE.test(text)) return true;
  return false;
}
