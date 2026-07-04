import { readMarketCompletionMeta } from "@/lib/globe/market/market-completion-metadata";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { isBridgeSharedEvent } from "@/lib/ontology/is-bridge-shared-event";
import type { SituationType } from "@/lib/situation-projection/types";

const CARE_KEYWORDS =
  /암|진단|병원|검진|치료|수술|입원|간병|어머니|아버지|부모|엄마|아빠/iu;

/** Deterministic situation classifier — no LLM. */
export function classifySituationTypeFromEvent(event: EventCandidate): SituationType {
  const blob = [
    event.title,
    event.place,
    typeof event.metadata?.note === "string" ? event.metadata.note : "",
    typeof event.metadata?.peerDisplayName === "string"
      ? event.metadata.peerDisplayName
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (readMarketCompletionMeta(event)) {
    return "trade";
  }
  if (isBridgeSharedEvent(event)) {
    return "collab";
  }
  if (CARE_KEYWORDS.test(blob)) {
    return "caregiving";
  }
  if (event.category === "travel" || /여행|trip|제주|출장/iu.test(blob)) {
    return "travel";
  }
  return "generic";
}
