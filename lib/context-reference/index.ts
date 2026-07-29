export type {
  ContextReferenceKind,
  ContextReferenceLink,
  LinkableContextCandidate,
} from "@/lib/context-reference/types";
export { CONTEXT_REFERENCE_KINDS } from "@/lib/context-reference/types";
export {
  clearContextReferenceLinksForTests,
  listContextReferenceLinks,
  writeContextReferenceLink,
  CONTEXT_REFERENCE_LINKS_UPDATED,
} from "@/lib/context-reference/context-reference-store";
export { extractContextPreferenceLines } from "@/lib/context-reference/extract-context-preference-lines";
export {
  listLinkableContextCandidates,
  type LinkCandidateTargetKind,
} from "@/lib/context-reference/list-linkable-context-candidates";
export { createContextReferenceLink } from "@/lib/context-reference/create-context-reference-link";
export { offerContextReferenceChips } from "@/lib/context-reference/offer-context-reference-chips";
