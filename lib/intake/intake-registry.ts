import { lodgingIntakeModule } from "@/lib/intake/domains/lodging/lodging-intake-module";
import { tripIntakeModule } from "@/lib/intake/domains/trip/trip-intake-module";
import type { DomainIntakeModule } from "@/lib/intake/types";

export const INTAKE_REGISTRY: readonly DomainIntakeModule<any, string>[] = [
  tripIntakeModule,
  lodgingIntakeModule,
].sort((left, right) => left.priority - right.priority);

export function intakeModuleById(
  domainId: string,
): DomainIntakeModule<any, string> | null {
  return INTAKE_REGISTRY.find((row) => row.domainId === domainId) ?? null;
}
