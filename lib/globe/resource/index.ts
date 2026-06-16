export type {
  ContextResource,
  ContextResourceAction,
  ContextResourceActionKind,
  ContextResourceKind,
  ContextResourceSpacetime,
} from "@/lib/globe/resource/types";

export {
  mapHubServiceRowToResource,
  type RankedContextResource,
} from "@/lib/globe/resource/map-hub-service-to-resource";

export { rankContextResources } from "@/lib/globe/resource/rank-context-resources";

export {
  buildMainNativeSurfaceCommand,
  buildMainNativeSurfacePayload,
} from "@/lib/globe/resource/build-main-native-surface-payload";

export {
  isMainNativeSurfaceEligible,
  MAIN_NATIVE_SURFACE_CONTRACT_VERSION,
  MAIN_NATIVE_SURFACE_PLUGIN,
  MAIN_NATIVE_SURFACE_PLUGIN_METHODS,
  type MainNativeSurfaceCommand,
  type MainNativeSurfacePayload,
  type MainNativeSurfacePlatform,
  type MainNativeSurfacePresentation,
} from "@/lib/globe/resource/main-native-surface";

export {
  anyWakeupFetchAllowed,
  minPollIntervalMs,
  resolveApiWakeupDecision,
  resolveApiWakeupPhase,
} from "@/lib/globe/resource/api-wakeup-controller";

export {
  API_WAKEUP_POLICIES,
  readApiWakeupPolicy,
} from "@/lib/globe/resource/api-wakeup-providers";

export type {
  ApiProviderId,
  ApiWakeupContext,
  ApiWakeupDecision,
  ApiWakeupPhase,
  ApiProviderWakeupPolicy,
} from "@/lib/globe/resource/api-wakeup-types";

export {
  buildApiWakeupContextFromEvent,
  buildApiWakeupContextFromWeatherTarget,
  readAppForeground,
} from "@/lib/globe/resource/build-api-wakeup-context";

export { isResourceSyncStale } from "@/lib/globe/resource/is-resource-sync-stale";
