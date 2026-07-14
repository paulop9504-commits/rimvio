export type {
  GlobeIngressBridgeDraft,
  GlobeIngressCompileResult,
  GlobeIngressContextDraft,
  GlobeIngressContextSlot,
  GlobeIngressForbiddenReentry,
  GlobeIngressIntent,
} from "@/lib/globe-ingress/types";
export { GLOBE_INGRESS_FORBIDDEN_REENTRY } from "@/lib/globe-ingress/types";
export {
  compileGlobeIngress,
  isGlobeIngressEligible,
} from "@/lib/globe-ingress/compile-globe-ingress";
export { isCountryOrRegionDestinationLabel } from "@/lib/globe-ingress/is-country-or-region-destination";
export {
  resolveIngressContextConverge,
  type IngressConvergeDecision,
  type IngressConvergeHit,
  type IngressContextConvergeResult,
} from "@/lib/globe-ingress/resolve-ingress-context-converge";

export { tryEnterDomainRuntimeAfterIngress } from "@/lib/globe-ingress/try-enter-domain-runtime-after-ingress-client";
