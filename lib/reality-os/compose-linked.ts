/**
 * Cross-Context Reality compose — merge primitives from approved Reference Links.
 * Read model only; does not mutate source Contexts (ADR-030 · ADR-034).
 */

import { listContextReferenceLinks } from "@/lib/context-reference/context-reference-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  readContextRealityBundle,
  type ContextRealityBundle,
} from "@/lib/reality-os/context-reality-store";
import {
  REALITY_PRIMITIVE_DEFS,
  type RealityPrimitiveId,
} from "@/lib/reality-os/primitives";
import { composeRealityForSdkKind } from "@/lib/reality-os/compose";

export type LinkedRealityEdge = {
  readonly sourceEventId: string;
  readonly titleKo: string;
  readonly labelKo: string;
  readonly primitives: readonly RealityPrimitiveId[];
};

export type LinkedRealityCompose = {
  readonly targetEventId: string;
  /** Local Context primitives. */
  readonly localPrimitives: readonly RealityPrimitiveId[];
  /** Union with linked sources (order: local first, then new). */
  readonly mergedPrimitives: readonly RealityPrimitiveId[];
  readonly links: readonly LinkedRealityEdge[];
  readonly summaryKo: string;
};

function primitivesFromEvent(eventId: string): readonly RealityPrimitiveId[] {
  const bundle = readContextRealityBundle(eventId);
  if (bundle) {
    return bundle.composition.primitives;
  }
  const event = findLifeEventCandidate(eventId);
  if (!event) {
    return [];
  }
  if (event.metadata?.workspaceKind === "used_goods") {
    return composeRealityForSdkKind("used_goods").primitives;
  }
  if (event.category === "travel" || /여행|출장/u.test(event.title)) {
    return composeRealityForSdkKind("travel").primitives;
  }
  return [];
}

export function composeLinkedReality(input: {
  readonly targetEventId: string;
  readonly localBundle?: ContextRealityBundle | null;
}): LinkedRealityCompose | null {
  const targetEventId = input.targetEventId.trim();
  if (!targetEventId) {
    return null;
  }
  const localBundle =
    input.localBundle ?? readContextRealityBundle(targetEventId);
  const localPrimitives = localBundle?.composition.primitives ?? [];
  const refs = listContextReferenceLinks(targetEventId);
  if (refs.length === 0 && localPrimitives.length === 0) {
    return null;
  }

  const links: LinkedRealityEdge[] = [];
  const merged: RealityPrimitiveId[] = [...localPrimitives];
  const seen = new Set<RealityPrimitiveId>(localPrimitives);

  for (const link of refs) {
    const source = findLifeEventCandidate(link.sourceEventId);
    const primitives = primitivesFromEvent(link.sourceEventId);
    links.push({
      sourceEventId: link.sourceEventId,
      titleKo: source?.title.trim() || link.labelKo,
      labelKo: link.labelKo,
      primitives,
    });
    for (const p of primitives) {
      if (!seen.has(p)) {
        seen.add(p);
        merged.push(p);
      }
    }
  }

  const linkTitles = links
    .slice(0, 2)
    .map((l) => l.titleKo.slice(0, 10))
    .join(" · ");
  const summaryKo =
    links.length > 0
      ? `연결 ${links.length} · ${linkTitles}`
      : localPrimitives
          .slice(0, 3)
          .map((id) => REALITY_PRIMITIVE_DEFS[id].labelKo)
          .join(" · ");

  return {
    targetEventId,
    localPrimitives,
    mergedPrimitives: merged,
    links,
    summaryKo,
  };
}
