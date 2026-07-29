/**
 * Create an approved Reference Link — never mutates the source Context.
 */

import { copy } from "@/lib/copy/human-ko";
import { writeContextReferenceLink } from "@/lib/context-reference/context-reference-store";
import { extractContextPreferenceLines } from "@/lib/context-reference/extract-context-preference-lines";
import type {
  ContextReferenceKind,
  ContextReferenceLink,
} from "@/lib/context-reference/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function createContextReferenceLink(input: {
  readonly targetEventId: string;
  readonly sourceEventId: string;
  readonly kind?: ContextReferenceKind;
  readonly labelKo?: string | null;
}):
  | { readonly ok: true; readonly link: ContextReferenceLink }
  | { readonly ok: false; readonly reasonKo: string } {
  const targetId = input.targetEventId.trim();
  const sourceId = input.sourceEventId.trim();
  if (!targetId || !sourceId) {
    return { ok: false, reasonKo: copy.globe.contextReferenceMissing };
  }
  if (targetId === sourceId) {
    return { ok: false, reasonKo: copy.globe.contextReferenceSelf };
  }
  const source = findLifeEventCandidate(sourceId);
  const target = findLifeEventCandidate(targetId);
  if (!source || !target) {
    return { ok: false, reasonKo: copy.globe.contextReferenceMissing };
  }

  const kind = input.kind ?? "style";
  const preferenceLinesKo = extractContextPreferenceLines(source);
  const labelKo =
    input.labelKo?.trim() ||
    copy.globe.contextReferenceDefaultLabel(source.title.trim() || "이전 맥락");

  const link: ContextReferenceLink = {
    id: `cref:${targetId}:${sourceId}:${kind}`,
    targetEventId: targetId,
    sourceEventId: sourceId,
    kind,
    labelKo,
    approvedByHuman: true,
    createdAtIso: new Date().toISOString(),
    preferenceLinesKo,
  };
  writeContextReferenceLink(link);

  // Stamp target only — source stays immutable.
  const prevMeta = target.metadata ?? {};
  const prevIds = Array.isArray(prevMeta.referencedContextIds)
    ? (prevMeta.referencedContextIds as unknown[]).filter(
        (id): id is string => typeof id === "string",
      )
    : [];
  commitEventUpsert({
    ...target,
    metadata: {
      ...prevMeta,
      referencedContextIds: [...new Set([sourceId, ...prevIds])].slice(0, 12),
      lastContextReferenceAt: link.createdAtIso,
      lastContextReferenceLabelKo: labelKo,
    },
  });

  return { ok: true, link };
}
