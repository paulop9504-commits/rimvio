import {
  expandCapabilityDependencies,
  getCapabilityDefinitions,
} from "./catalog";
import type { CapabilityDefinition, CapabilityGapResult } from "./types";
import { BUILTIN_CAPABILITY_IDS } from "./types";

export class CapabilityRouter {
  private readonly installed: Set<string>;

  constructor(installedCapabilityIds: string[]) {
    this.installed = new Set([
      ...BUILTIN_CAPABILITY_IDS,
      ...installedCapabilityIds,
    ]);
  }

  getInstalledIds(): string[] {
    return [...this.installed];
  }

  check(requiredIds: string[]): CapabilityGapResult {
    const expanded = expandCapabilityDependencies(requiredIds);
    const missing = expanded.filter((id) => !this.installed.has(id));
    const definitions = getCapabilityDefinitions(missing);

    return {
      ready: missing.length === 0,
      missing,
      definitions,
    };
  }

  /** Installable capabilities that need user approval (non-builtin). */
  getInstallableMissing(missing: string[]): CapabilityDefinition[] {
    return getCapabilityDefinitions(missing).filter((c) => c.tier !== "builtin");
  }

  markInstalled(capabilityId: string): void {
    this.installed.add(capabilityId);
  }
}

export function resolveCapabilityGap(
  installedIds: string[],
  requiredIds: string[],
): CapabilityGapResult {
  return new CapabilityRouter(installedIds).check(requiredIds);
}
