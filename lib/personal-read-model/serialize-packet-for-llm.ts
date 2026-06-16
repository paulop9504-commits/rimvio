import type { PersonalReadPacket } from "@/lib/personal-read-model/types";

const MAX_TOP_EDGES = 5;
const MAX_ROLLUP = 8;
const MAX_REGISTRY = 12;
const MAX_RANKED_MAIN = 3;

/** Compact JSON block for LLM prompt injection — no raw EventCandidate blobs. */
export function serializePacketForLlm(
  packet: PersonalReadPacket,
  input?: { redactPrivateFacts?: boolean },
): string {
  const redact = input?.redactPrivateFacts === true && packet.meta.scopeAi === "explorer";

  const payload = {
    version: 1,
    meta: packet.meta,
    fact: redact
      ? {
          ...packet.fact,
          recentEventIds: packet.fact.recentEventIds.slice(0, 4),
          linkSummaries: [],
          activeLinkIds: [],
        }
      : packet.fact,
    experience: packet.experience,
    meaning: {
      ...packet.meaning,
      topEdges: packet.meaning.topEdges.slice(0, MAX_TOP_EDGES),
      rollupAffinities: packet.meaning.rollupAffinities.slice(0, MAX_ROLLUP),
    },
    recall: packet.recall,
    action: {
      ...packet.action,
      registryEntries: packet.action.registryEntries.slice(0, MAX_REGISTRY),
      rankedMainCandidates: packet.action.rankedMainCandidates.slice(0, MAX_RANKED_MAIN),
    },
    gates: packet.gates,
  };

  return `[PersonalReadPacket v1]\n${JSON.stringify(payload, null, 2)}`;
}
