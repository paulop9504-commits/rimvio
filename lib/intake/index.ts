export type {
  DomainIntakeModule,
  DomainIntakeSnapshot,
  IntakeContext,
  IntakeOffer,
  SlotDefinition,
} from "@/lib/intake/types";

export {
  assessGapsFromSlots,
  isIntakeComplete,
} from "@/lib/intake/assess-gaps-from-slots";

export { buildIntakeSnapshot } from "@/lib/intake/build-intake-snapshot";

export { createDomainIntakeModule } from "@/lib/intake/create-domain-intake-module";

export { INTAKE_REGISTRY, intakeModuleById } from "@/lib/intake/intake-registry";

export {
  buildIntakeContext,
  resolveIntakeOffer,
} from "@/lib/intake/resolve-intake-offer";

export type {
  IntakeSheetField,
  IntakeSheetFieldKind,
  IntakeSheetEnumOption,
} from "@/lib/intake/intake-sheet-field-types";

export { tripIntakeModule, TRIP_INTAKE_DOMAIN_ID } from "@/lib/intake/domains/trip/trip-intake-module";

export {
  lodgingIntakeModule,
  LODGING_INTAKE_DOMAIN_ID,
} from "@/lib/intake/domains/lodging/lodging-intake-module";
