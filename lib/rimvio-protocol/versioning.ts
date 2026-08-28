/**
 * Versioning + compatibility contracts.
 * docs/RIMVIO_OS_CONSTITUTION.md §21-22
 */

export type RimvioSemverRange = string;

export type RimvioCapabilityDependency = {
  readonly capabilityId: string;
  readonly versionRange: RimvioSemverRange;
};

export type RimvioPlatformCompatibility = {
  readonly platformVersion: string;
  readonly manifestSpec: string;
  readonly capabilityDependencies: readonly RimvioCapabilityDependency[];
  readonly hostVersionRange: RimvioSemverRange;
};

export function parseMajorMinor(version: string): { major: number; minor: number } | null {
  const match = /^(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function satisfiesCapabilityRange(
  installedVersion: string,
  requiredRange: RimvioSemverRange,
): boolean {
  const installed = parseMajorMinor(installedVersion);
  const required = parseMajorMinor(requiredRange.replace(/^>=/, ""));
  if (!installed || !required) return false;
  if (requiredRange.startsWith(">=")) {
    return (
      installed.major > required.major ||
      (installed.major === required.major && installed.minor >= required.minor)
    );
  }
  return installed.major === required.major && installed.minor === required.minor;
}
