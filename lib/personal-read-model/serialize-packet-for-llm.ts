import type { PersonalReadPacket } from "@/lib/personal-read-model/types";
import { redactPacketForExplorer } from "@/lib/personal-read-model/redact-packet-for-explorer";
import { buildSemanticGroundingPrompt } from "@/lib/semantic/semantic-grounding-prompt";

const MAX_TOP_EDGES = 5;
const MAX_ROLLUP = 8;
const MAX_REGISTRY = 12;
const MAX_RANKED_MAIN = 3;
const MAX_SEMANTIC_TRIPLES = 8;

/** Compact JSON block for LLM prompt injection — no raw EventCandidate blobs. */
export function serializePacketForLlm(
  packet: PersonalReadPacket,
  input?: { redactPrivateFacts?: boolean },
): string {
  const redact =
    input?.redactPrivateFacts === true &&
    (packet.meta.scopeAi === "explorer" || packet.experience.focus.visibility === "external");
  const source = redact ? redactPacketForExplorer(packet) : packet;

  const payload = {
    version: 1,
    meta: source.meta,
    fact: source.fact,
    experience: source.experience,
    meaning: {
      ...source.meaning,
      topEdges: source.meaning.topEdges.slice(0, MAX_TOP_EDGES),
      rollupAffinities: source.meaning.rollupAffinities.slice(0, MAX_ROLLUP),
      semanticTriples: source.meaning.semanticTriples.slice(0, MAX_SEMANTIC_TRIPLES),
    },
    recall: source.recall,
    action: {
      ...source.action,
      registryEntries: source.action.registryEntries.slice(0, MAX_REGISTRY),
      rankedMainCandidates: source.action.rankedMainCandidates.slice(0, MAX_RANKED_MAIN),
      semanticMainHint: source.action.semanticMainHint,
    },
    gates: source.gates,
  };

  return `${buildSemanticGroundingPrompt()}\n\n[PersonalReadPacket v1]\n${JSON.stringify(payload, null, 2)}`;
}
