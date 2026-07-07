import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { parsePalantirFacetFromMessage } from "@/lib/globe/spatial-semantic/resolve-palantir-refine-intent";
import type { GeoOntologyFacetId } from "@/lib/globe/spatial-semantic/types";

/** Operator picks ranking facet from message + spec — no manual facet chips. */
export function resolvePalantirAutoFacet(input: {
  triggerMessage?: string | null;
  spec: LocalDiscoveryActionSpec;
}): GeoOntologyFacetId {
  const fromMessage = parsePalantirFacetFromMessage(input.triggerMessage?.trim() ?? "");
  if (fromMessage) {
    return fromMessage;
  }

  const spec = input.spec;
  if (spec.budget === "low") {
    return "price";
  }
  if (spec.transport === "walk") {
    return "distance";
  }
  if (spec.vibe === "quiet" || spec.vibe === "local" || spec.vibe === "hot") {
    return "vibe";
  }
  if (spec.eateryFocus?.trim()) {
    return "category";
  }
  if (spec.budget === "high") {
    return "rating";
  }
  return "rating";
}
