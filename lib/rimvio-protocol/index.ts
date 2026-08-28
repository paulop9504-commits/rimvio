/**
 * Rimvio Protocol — OS constitutional types.
 * docs/RIMVIO_OS_CONSTITUTION.md · ADR-057
 */

export {
  RIMVIO_OS_ENTITY_KINDS,
  RIMVIO_OS_RELATION_KINDS,
  RIMVIO_OS_CANONICAL_RELATIONS,
  isRimvioOsEntityKind,
  entityRef,
  type RimvioOsEntityKind,
  type RimvioOsRelationKind,
  type RimvioOsEntityRef,
  type RimvioOsRelation,
  type RimvioOsObject,
} from "@/lib/rimvio-protocol/object-model";

export {
  type RimvioPersonalIdentity,
  type RimvioPlatformIdentity,
  type RimvioPlatformIdentityRole,
  type RimvioOrganization,
  type RimvioOrganizationIdentity,
  type RimvioOrganizationRole,
  type RimvioUserIdentity,
  type RimvioTrustBadge,
  type RimvioTrustLevel,
  type RimvioTrustProfile,
} from "@/lib/rimvio-protocol/identity";

export {
  RIMVIO_CONTEXT_PATHS,
  contextPathValues,
  type RimvioContextPath,
  type RimvioContextEnvelope,
  type RimvioUserContext,
  type RimvioLocaleContext,
  type RimvioLocationContext,
  type RimvioSessionContext,
} from "@/lib/rimvio-protocol/context";

export {
  RIMVIO_INTENT_ACTIONS,
  compileIntentFromUtterance,
  type RimvioIntentAction,
  type RimvioIntentFrame,
} from "@/lib/rimvio-protocol/intent";

export {
  defaultCapabilityContract,
  type RimvioCapabilityContract,
  type CapabilitySideEffect,
  type CapabilityRiskTier,
} from "@/lib/rimvio-protocol/capability-contract";

export {
  buildPlatformContract,
  type RimvioPlatformContract,
} from "@/lib/rimvio-protocol/platform-contract";

export {
  RIMVIO_EVENT_PATTERN,
  RIMVIO_CANONICAL_EVENTS,
  isValidRimvioEventName,
  type RimvioPlatformEvent,
  type RimvioCanonicalEvent,
} from "@/lib/rimvio-protocol/events";

export {
  type RimvioCommerceApi,
  type RimvioCommerceOrder,
  type RimvioCommercePaymentRequest,
  type RimvioCommerceProduct,
} from "@/lib/rimvio-protocol/commerce";

export {
  satisfiesCapabilityRange,
  type RimvioCapabilityDependency,
  type RimvioPlatformCompatibility,
} from "@/lib/rimvio-protocol/versioning";

export {
  evaluatePolicyMvp,
  type RimvioPolicyDecision,
  type RimvioPolicyEngine,
  type RimvioPolicyRequest,
  type RimvioPolicyResult,
} from "@/lib/rimvio-protocol/policy";
