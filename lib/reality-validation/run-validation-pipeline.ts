/**
 * Run all registered validators and return aggregated result.
 */

import type {
  ValidationContext,
  ValidationPipelineResult,
} from "@/lib/reality-validation/types";
import { getRegisteredValidators } from "@/lib/reality-validation/validation-registry";

export function runValidationPipeline(
  ctx: ValidationContext,
): ValidationPipelineResult {
  const validators = getRegisteredValidators();
  const checks = validators.map((v) => v.validate(ctx));

  const blockers = checks.filter((c) => c.status === "fail");
  const warnings = checks.filter((c) => c.status === "warn");
  const allPassed = blockers.length === 0;

  return { allPassed, checks, blockers, warnings };
}
