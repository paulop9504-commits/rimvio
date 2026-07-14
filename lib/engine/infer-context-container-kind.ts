import type { ContextContainerKind } from "@/lib/context-blueprint/blueprint-constants";
import { CONTEXT_CONTAINER_KINDS } from "@/lib/context-blueprint/blueprint-constants";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

export const CONTEXT_CONTAINER_KIND_META_KEY = "contextContainerKind" as const;

function asContainerKind(value: unknown): ContextContainerKind | null {
  if (typeof value !== "string") {
    return null;
  }
  return (CONTEXT_CONTAINER_KINDS as readonly string[]).includes(value)
    ? (value as ContextContainerKind)
    : null;
}

/** Infer project container kind — Blueprint wins, then metadata, then event category. */
export function inferContextContainerKind(input: {
  event?: EventCandidate | null;
  blueprint?: ContextBlueprint | null;
}): ContextContainerKind {
  if (input.blueprint?.containerKind) {
    return input.blueprint.containerKind;
  }
  const fromMeta = asContainerKind(input.event?.metadata?.[CONTEXT_CONTAINER_KIND_META_KEY]);
  if (fromMeta) {
    return fromMeta;
  }
  if (input.event?.category === "travel") {
    return "travel";
  }
  if (input.event?.category === "finance") {
    return "finance";
  }
  return "generic";
}
