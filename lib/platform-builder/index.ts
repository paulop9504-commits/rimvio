export {
  RIMVIO_BUILDER_RIR_VERSION,
  type RimvioBuilderRir,
  type PlatformRir,
  type CapabilityRir,
  type BuilderSession,
  type BuilderPhase,
  type BuilderViewMode,
  type BuilderClarification,
  type BuilderChangeLogEntry,
  type PlannerResult,
  isPlatformRir,
} from "@/lib/platform-builder/rir";

export {
  compilePlatformRirToManifest,
  summarizeBlueprintKo,
} from "@/lib/platform-builder/compile-rir";

export { planFromUtterance } from "@/lib/platform-builder/plan-from-utterance";
