import type { BoundSituation, ContextRunPlan } from "@/lib/context-run/ingress-types";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { detectPortalIntentFromText } from "@/lib/portal/detect-portal-intent-from-text";
import {
  parsePersonalContextQuery,
} from "@/lib/personal-context-ask";

const PERSON_PLACE_RECALL_RE =
  /(?:어디|갔|다녀|만난|여행|trip|went|where)/iu;

/** Recall-shaped personal ask — reads stored globe context (EventCandidate SSOT). */
export function planPersonalRecallAskIfEligible(
  bound: BoundSituation,
  text: string,
): ContextRunPlan | null {
  const ingress = bound.ingress;
  if (ingress.kind !== "text" || ingress.layerMode !== "personal") {
    return null;
  }
  if (ingress.surface !== "capture_sheet" && ingress.surface !== "composer") {
    return null;
  }
  if (detectPortalIntentFromText(text)) {
    return null;
  }
  if (classifyExperienceRunIntent(text)) {
    return null;
  }

  const parsed = parsePersonalContextQuery(text);
  const recallShaped =
    parsed.intent !== "general" ||
    (parsed.personNeedles.length > 0 &&
      (PERSON_PLACE_RECALL_RE.test(text) || parsed.placeNeedles.length > 0)) ||
    (parsed.personNeedles.length > 0 && parsed.target === "photo");

  if (!recallShaped) {
    return null;
  }

  return {
    kind: "personal_context_ask",
    graphId: bound.graphId,
    goalKo: bound.goalKo,
  };
}
