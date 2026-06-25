export type {
  ExternalContextAskKind,
  ExternalContextAskResult,
  ExternalContextOpportunityHit,
  ExternalContextSources,
  ExternalOpportunityCta,
  ExternalOpportunityKind,
  ExternalQueryIntent,
} from "@/lib/external-context-ask/external-context-opportunity-types";
export { classifyExternalQueryIntent } from "@/lib/external-context-ask/classify-external-query-intent";
export {
  buildExternalContextNarrative,
  type ExternalContextNarrative,
} from "@/lib/external-context-ask/build-external-context-narrative";
export { formatExternalEmptyReply } from "@/lib/external-context-ask/format-external-empty-reply";
export { fetchExternalContextSourcesClient } from "@/lib/external-context-ask/fetch-external-context-sources-client";
export {
  normalizeAlignmentChat,
  normalizeExternalContextSources,
  normalizeExternalTrace,
  normalizeMarketIntent,
  type NormalizedExternalOpportunity,
} from "@/lib/external-context-ask/normalize-external-opportunity-sources";
export { resolveExternalContextAsk } from "@/lib/external-context-ask/resolve-external-context-ask";
