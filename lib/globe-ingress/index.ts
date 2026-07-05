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
