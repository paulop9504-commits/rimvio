import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { resolveExecutionNodesForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import { FIXTURE_ACME_LODGING_ENGINE_MANIFEST } from "@/lib/marketplace/marketplace-test-fixtures";
import { normalizePublishedEngineManifest } from "@/lib/marketplace/normalize-provider-member-ref";
import { indexProviderMemberFromEngineManifest } from "@/lib/marketplace/provider-member-registry";
import type { PublishedEngineManifest } from "@/lib/marketplace/marketplace-contract";

const manifests = new Map<string, PublishedEngineManifest>();

function manifestKey(engineId: string, version: string, providerId: string): string {
  return `${engineId}@${version}#${providerId}`;
}

const RIMVIO_FIRST_PARTY_ENGINE_MANIFESTS_RAW: readonly PublishedEngineManifest[] = [
  {
    manifestId: "eng-flight-booking-rimvio-1",
    engineId: "flight_booking",
    version: "1.0.0",
    providerId: "rimvio_travel",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Flight booking engine — departure hub + BOOK_FLIGHT",
    capabilityIds: ["BOOK_FLIGHT", "CHECK_IN"],
    executionNodeIds: ["departure"],
    pricing: { model: "per_action", unitCost: 0.05, currency: "KRW" },
    reputation: {
      providerId: "rimvio_travel",
      reliabilityScore: 0.95,
      speedScore: 0.9,
      costScore: 0.85,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    manifestId: "eng-lodging-search-rimvio-1",
    engineId: "lodging_search",
    version: "1.0.0",
    providerId: "rimvio_travel",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Lodging search engine — scout + BOOK_HOTEL",
    capabilityIds: ["BOOK_HOTEL", "NAVIGATE"],
    executionNodeIds: ["stay"],
    pricing: { model: "per_action", unitCost: 0.04, currency: "KRW" },
    reputation: {
      providerId: "rimvio_travel",
      reliabilityScore: 0.93,
      speedScore: 0.88,
      costScore: 0.82,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    manifestId: "eng-trip-experience-rimvio-1",
    engineId: "trip_experience_search",
    version: "1.0.0",
    providerId: "rimvio_travel",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Exploratory trip search — parallel scouts",
    capabilityIds: ["NAVIGATE", "BOOK_HOTEL"],
    executionNodeIds: ["trip", "explore"],
    pricing: { model: "per_action", unitCost: 0.03, currency: "KRW" },
    reputation: {
      providerId: "rimvio_travel",
      reliabilityScore: 0.91,
      speedScore: 0.86,
      costScore: 0.88,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    manifestId: "eng-transit-navigate-rimvio-1",
    engineId: "transit_navigate",
    version: "1.0.0",
    providerId: "rimvio_mobility",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Transit engine — departure · arrival · return nodes",
    capabilityIds: ["NAVIGATE", "CONFIRM_PLACE"],
    executionNodeIds: ["departure", "arrival", "return"],
    pricing: { model: "per_action", unitCost: 0.02, currency: "KRW" },
    reputation: {
      providerId: "rimvio_mobility",
      reliabilityScore: 0.9,
      speedScore: 0.92,
      costScore: 0.9,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    manifestId: "eng-finance-prep-rimvio-1",
    engineId: "finance_prep",
    version: "1.0.0",
    providerId: "rimvio_finance",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Finance prep engine — budget · payment policy",
    capabilityIds: ["PLUGIN:payment:charge"],
    executionNodeIds: ["prepare"],
    pricing: { model: "per_action", unitCost: 0.01, currency: "KRW" },
    reputation: {
      providerId: "rimvio_finance",
      reliabilityScore: 0.94,
      speedScore: 0.95,
      costScore: 0.8,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    manifestId: "eng-local-amenity-search-rimvio-1",
    engineId: "local_amenity_search",
    version: "1.0.0",
    providerId: "rimvio_travel",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Local amenity engine — pharmacy · convenience · ATM",
    capabilityIds: ["NAVIGATE", "CONFIRM_PLACE"],
    executionNodeIds: ["explore"],
    pricing: { model: "per_action", unitCost: 0.02, currency: "KRW" },
    reputation: {
      providerId: "rimvio_travel",
      reliabilityScore: 0.92,
      speedScore: 0.94,
      costScore: 0.9,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-11T00:00:00.000Z",
  },
  {
    manifestId: "eng-eatery-search-rimvio-1",
    engineId: "eatery_search",
    version: "1.0.0",
    providerId: "rimvio_travel",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Eatery search engine — restaurant · cafe · cuisine",
    capabilityIds: ["NAVIGATE", "CONFIRM_PLACE"],
    executionNodeIds: ["explore"],
    pricing: { model: "per_action", unitCost: 0.03, currency: "KRW" },
    reputation: {
      providerId: "rimvio_travel",
      reliabilityScore: 0.91,
      speedScore: 0.9,
      costScore: 0.86,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-11T00:00:00.000Z",
  },
  {
    manifestId: "eng-activity-search-rimvio-1",
    engineId: "activity_search",
    version: "1.0.0",
    providerId: "rimvio_travel",
    publisherId: "rimvio",
    providerKind: "ai_agent",
    description: "Activity search engine — attractions · things to do",
    capabilityIds: ["NAVIGATE", "CONFIRM_PLACE"],
    executionNodeIds: ["explore"],
    pricing: { model: "per_action", unitCost: 0.03, currency: "KRW" },
    reputation: {
      providerId: "rimvio_travel",
      reliabilityScore: 0.9,
      speedScore: 0.88,
      costScore: 0.87,
      invocationCount: 0,
      successCount: 0,
    },
    publishedAt: "2026-07-11T00:00:00.000Z",
  },
];

const THIRD_PARTY_ENGINE_MANIFESTS_RAW: readonly PublishedEngineManifest[] = [
  FIXTURE_ACME_LODGING_ENGINE_MANIFEST,
];

const ALL_ENGINE_MANIFESTS_RAW: readonly PublishedEngineManifest[] = [
  ...RIMVIO_FIRST_PARTY_ENGINE_MANIFESTS_RAW,
  ...THIRD_PARTY_ENGINE_MANIFESTS_RAW,
];

const RIMVIO_FIRST_PARTY_ENGINE_MANIFESTS: readonly PublishedEngineManifest[] =
  ALL_ENGINE_MANIFESTS_RAW.map((row) => normalizePublishedEngineManifest(row));

let bootstrapped = false;

function ensureEngineManifestsBootstrapped(): void {
  if (bootstrapped) {
    return;
  }
  for (const row of RIMVIO_FIRST_PARTY_ENGINE_MANIFESTS) {
    manifests.set(manifestKey(row.engineId, row.version, row.providerId), row);
    indexProviderMemberFromEngineManifest(row);
  }
  bootstrapped = true;
}

export function publishEngineManifest(
  manifest: PublishedEngineManifest,
): { ok: true } | { ok: false; reason: string } {
  ensureEngineManifestsBootstrapped();
  const normalized = normalizePublishedEngineManifest(manifest);
  const key = manifestKey(normalized.engineId, normalized.version, normalized.providerId);
  if (manifests.has(key)) {
    return { ok: false, reason: "engine_manifest_conflict" };
  }
  manifests.set(key, normalized);
  indexProviderMemberFromEngineManifest(normalized);
  return { ok: true };
}

export function getPublishedEngineManifest(
  engineId: string,
  version: string,
  providerId: string,
): PublishedEngineManifest | null {
  ensureEngineManifestsBootstrapped();
  return manifests.get(manifestKey(engineId, version, providerId)) ?? null;
}

export function getPublishedEngineManifestByManifestId(
  manifestId: string,
): PublishedEngineManifest | null {
  ensureEngineManifestsBootstrapped();
  const trimmed = manifestId.trim();
  if (!trimmed) {
    return null;
  }
  return [...manifests.values()].find((row) => row.manifestId === trimmed) ?? null;
}

export function listPublishedEngineManifests(
  engineId?: string,
): readonly PublishedEngineManifest[] {
  ensureEngineManifestsBootstrapped();
  const rows = [...manifests.values()];
  if (!engineId) {
    return rows;
  }
  return rows.filter((row) => row.engineId === engineId);
}

export function resolveEngineCapabilityIds(
  engineId: RimvioEngineId,
): readonly string[] {
  ensureEngineManifestsBootstrapped();
  const fromManifest = listPublishedEngineManifests(engineId).flatMap(
    (row) => row.capabilityIds,
  );
  if (fromManifest.length > 0) {
    return [...new Set(fromManifest)];
  }
  return [];
}

export function syncEngineManifestExecutionNodes(
  engineId: RimvioEngineId,
): readonly string[] {
  const fromGraph = resolveExecutionNodesForEngine(engineId).map((row) => row.nodeId);
  const fromManifest = listPublishedEngineManifests(engineId).flatMap(
    (row) => row.executionNodeIds,
  );
  return [...new Set([...fromGraph, ...fromManifest])];
}

export function resetEngineMarketRegistryForTests(): void {
  manifests.clear();
  bootstrapped = false;
}
