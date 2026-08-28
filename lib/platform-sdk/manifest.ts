/**
 * Manifest validation + capability synthesis helpers.
 * docs/RIMVIO_PLATFORM_SDK_SPEC.md §3 · §7
 */

import {
  RIMVIO_PLATFORM_MANIFEST_VERSION,
  type CapabilityDeclaration,
  type RimvioPlatformManifest,
} from "@/lib/platform-sdk/types";
import {
  computePlatformSecurityImpact,
  isForbiddenPlatformPermission,
} from "@/lib/platform-sdk/permissions";
import {
  canPublishAnyMarket,
  isRealMarketCode,
  marketsBlockingPublishKo,
  synthesizeMarketsDeclaration,
} from "@/lib/platform-sdk/markets";

const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const PLATFORM_ID_PATTERN = /^platform\.[a-z][a-z0-9-]*$/;
const SCHEMA_REF_PATTERN = /^[a-z][a-z0-9_]*\.v[0-9]+$/;

export type ManifestValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};

function pushError(errors: string[], message: string): void {
  errors.push(message);
}

export function validateRimvioPlatformManifest(
  manifest: RimvioPlatformManifest,
): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest.specVersion !== RIMVIO_PLATFORM_MANIFEST_VERSION) {
    pushError(errors, `Unsupported specVersion: ${manifest.specVersion}`);
  }

  if (!PLATFORM_ID_PATTERN.test(manifest.package.id)) {
    pushError(errors, "package.id must match platform.<slug>");
  }

  if (!manifest.package.name.trim()) {
    pushError(errors, "package.name is required");
  }

  if (!manifest.package.version.trim()) {
    pushError(errors, "package.version is required");
  }

  const markets = synthesizeMarketsDeclaration(manifest.markets);
  const realDeployments = markets.deployments.filter((d) => isRealMarketCode(d.country));
  if (realDeployments.length === 0) {
    pushError(errors, "At least one country market deployment is required");
  }
  if (markets.primary === "GLOBAL") {
    warnings.push("Global is not a deployable market — configure country deployments");
  }
  const publishBlock = marketsBlockingPublishKo(markets);
  if (publishBlock && !canPublishAnyMarket(markets)) {
    warnings.push(publishBlock);
  }

  for (const perm of [
    ...manifest.permissions.required,
    ...manifest.permissions.optional,
  ]) {
    if (isForbiddenPlatformPermission(perm)) {
      pushError(errors, `Forbidden permission: ${perm}`);
    }
  }

  for (const cap of manifest.capabilities) {
    if (!CAPABILITY_ID_PATTERN.test(cap.id)) {
      pushError(errors, `Invalid capability id: ${cap.id}`);
    }
    if (!SCHEMA_REF_PATTERN.test(cap.inputSchema)) {
      warnings.push(`capability ${cap.id}: inputSchema should be name.vN`);
    }
    if (!SCHEMA_REF_PATTERN.test(cap.outputSchema)) {
      warnings.push(`capability ${cap.id}: outputSchema should be name.vN`);
    }
  }

  if (manifest.data.isolation !== "tenant_strict") {
    warnings.push("Only tenant_strict isolation is recommended for v1");
  }

  for (const col of manifest.data.collections) {
    if (!/^[a-z][a-z0-9_]*$/.test(col.name)) {
      pushError(errors, `Invalid collection name: ${col.name}`);
    }
  }

  for (const imp of manifest.composition.imports) {
    if (!PLATFORM_ID_PATTERN.test(imp.platformId)) {
      pushError(errors, `Invalid composition platformId: ${imp.platformId}`);
    }
    if (imp.capabilities.length === 0) {
      pushError(errors, `composition import ${imp.platformId} needs capabilities`);
    }
  }

  const enabled = manifest.permissions.required;
  const impact = computePlatformSecurityImpact(enabled);
  if (impact === "critical") {
    warnings.push("Security impact is critical — expect extended Hub review");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Suggest CRUD capabilities from data collections (review step may merge). */
export function synthesizeCapabilitiesFromCollections(
  platformSlug: string,
  collectionNames: readonly string[],
): CapabilityDeclaration[] {
  const domain = platformSlug.replace(/^platform\./, "").replace(/-/g, "_");
  const out: CapabilityDeclaration[] = [];

  for (const collection of collectionNames) {
    const singular = collection.endsWith("s") ? collection.slice(0, -1) : collection;
    out.push(
      {
        id: `${domain}.search_${collection}`,
        name: `Search ${collection}`,
        inputSchema: `${domain}.search_${collection}.v1`,
        outputSchema: `${domain}.search_result.v1`,
        approvalRequired: false,
        synthesized: true,
      },
      {
        id: `${domain}.create_${singular}`,
        name: `Create ${singular}`,
        inputSchema: `${domain}.create_${singular}.v1`,
        outputSchema: `${domain}.${singular}.v1`,
        approvalRequired: true,
        synthesized: true,
      },
    );
  }

  return out;
}

export function buildCapabilityIndexEntry(manifest: RimvioPlatformManifest) {
  const markets = synthesizeMarketsDeclaration(manifest.markets);
  const deployments = markets.deployments.filter((d) => isRealMarketCode(d.country));
  const entries: Array<{
    capabilityId: string;
    platformId: string;
    platformName: string;
    marketCountry: string;
    inputSchema: string;
    outputSchema: string;
    approvalRequired: boolean;
    category: string;
    tags: readonly string[];
  }> = [];

  for (const deployment of deployments) {
    for (const cap of manifest.capabilities) {
      const capMarkets = cap.markets;
      if (capMarkets?.length && !capMarkets.includes(deployment.country)) {
        continue;
      }
      if (
        deployment.capabilityIds?.length &&
        !deployment.capabilityIds.includes(cap.id)
      ) {
        continue;
      }
      entries.push({
        capabilityId: cap.id,
        platformId: manifest.package.id,
        platformName: manifest.package.name,
        marketCountry: deployment.country,
        inputSchema: cap.inputSchema,
        outputSchema: cap.outputSchema,
        approvalRequired: cap.approvalRequired,
        category: manifest.package.category,
        tags: manifest.package.tags,
      });
    }
  }

  return entries;
}
