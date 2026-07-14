/**
 * L1 labels for Engine Store hub chips.
 */

import { copy } from "@/lib/copy/human-ko";
import type { InstalledEngineRecordV1 } from "@/lib/engine/context-installed-engines-metadata";
import type { RimvioEngineId, RimvioEngineRunState } from "@/lib/engine/engine-types";
import { getRimvioEnginePackageById, readRimvioEngineRunState } from "@/lib/engine/engine-registry";
import { inferContextContainerKind } from "@/lib/engine/infer-context-container-kind";
import {
  readContextInstalledEngineRecords,
  readContextInstalledEngineIds,
} from "@/lib/engine/resolve-context-installed-engines";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  getPublishedEngineManifestByManifestId,
  listPublishedEngineManifests,
} from "@/lib/marketplace/engine-market-registry";
import type { ProviderKind } from "@/lib/marketplace/provider-network-types";
import { readProviderMemberId } from "@/lib/marketplace/normalize-provider-member-ref";
import { formatProviderMemberLabel } from "@/lib/marketplace/format-provider-member-label";
import { getProviderNetworkMember } from "@/lib/marketplace/provider-member-registry";
import type { PublishedEngineManifest } from "@/lib/marketplace/marketplace-contract";

export type ContextEngineStoreProviderMeta = {
  providerMemberId: string;
  providerMemberLabelKo: string;
  providerKind?: ProviderKind;
  providerKindLabelKo?: string;
};

export type ContextEngineStoreInstalledRow = {
  engineId: RimvioEngineId;
  labelKo: string;
  source: InstalledEngineRecordV1["source"];
  runState: RimvioEngineRunState;
  provider: ContextEngineStoreProviderMeta | null;
};

export type ContextEngineStoreOfferRow = {
  manifestId: string;
  engineId: RimvioEngineId;
  labelKo: string;
  description: string;
  provider: ContextEngineStoreProviderMeta;
};

export function formatInstalledEngineChipLabel(engineId: RimvioEngineId): string {
  const labels = copy.globe.engineStore.chip;
  return labels[engineId] ?? engineId;
}

export { formatProviderMemberLabel };

export function formatProviderKindLabel(kind: ProviderKind | undefined): string | undefined {
  if (!kind) {
    return undefined;
  }
  return copy.globe.engineStore.providerKind[kind];
}

function resolveStoreManifest(input: {
  engineId: RimvioEngineId;
  manifestId?: string;
}): PublishedEngineManifest | null {
  if (input.manifestId) {
    const byId = getPublishedEngineManifestByManifestId(input.manifestId);
    if (byId) {
      return byId;
    }
  }
  return listPublishedEngineManifests(input.engineId)[0] ?? null;
}

export function buildEngineStoreProviderMeta(
  manifest: PublishedEngineManifest | null,
): ContextEngineStoreProviderMeta | null {
  if (!manifest) {
    return null;
  }
  const providerMemberId = readProviderMemberId(manifest);
  const member = getProviderNetworkMember(providerMemberId);
  const providerKind = member?.kind ?? manifest.providerKind;
  return {
    providerMemberId,
    providerMemberLabelKo: formatProviderMemberLabel(providerMemberId),
    providerKind,
    providerKindLabelKo: formatProviderKindLabel(providerKind),
  };
}

export type EngineStoreOfferFilter = {
  providerKind?: ProviderKind;
  /** When true, only organization (partner) supply-side offers. */
  partnerOnly?: boolean;
};

export function filterContextEngineStoreOffers(
  offers: readonly ContextEngineStoreOfferRow[],
  filter: EngineStoreOfferFilter = {},
): ContextEngineStoreOfferRow[] {
  return offers.filter((offer) => {
    if (filter.providerKind && offer.provider.providerKind !== filter.providerKind) {
      return false;
    }
    if (filter.partnerOnly && offer.provider.providerKind !== "organization") {
      return false;
    }
    return true;
  });
}

function mapManifestToOfferRow(manifest: PublishedEngineManifest): ContextEngineStoreOfferRow {
  const provider = buildEngineStoreProviderMeta(manifest);
  return {
    manifestId: manifest.manifestId,
    engineId: manifest.engineId as RimvioEngineId,
    labelKo: formatInstalledEngineChipLabel(manifest.engineId as RimvioEngineId),
    description: manifest.description,
    provider: provider ?? {
      providerMemberId: readProviderMemberId(manifest),
      providerMemberLabelKo: formatProviderMemberLabel(readProviderMemberId(manifest)),
    },
  };
}

export function buildContextEngineStoreOfferRows(input: {
  event?: EventCandidate | null;
  blueprint?: ContextBlueprint | null;
}): ContextEngineStoreOfferRow[] {
  const records = readContextInstalledEngineRecords(input);
  const installedManifestIds = new Set(records.map((row) => row.manifestId));
  const containerKind = inferContextContainerKind(input);

  return listPublishedEngineManifests()
    .filter((manifest) => {
      if (installedManifestIds.has(manifest.manifestId)) {
        return false;
      }
      const pkg = getRimvioEnginePackageById(manifest.engineId as RimvioEngineId);
      if (!pkg) {
        return false;
      }
      if (containerKind === "generic") {
        return true;
      }
      return pkg.containerKind === containerKind;
    })
    .map(mapManifestToOfferRow)
    .sort((left, right) => left.labelKo.localeCompare(right.labelKo, "ko"));
}

export function buildContextEngineStoreRows(input: {
  event?: EventCandidate | null;
  blueprint?: ContextBlueprint | null;
}): {
  installed: ContextEngineStoreInstalledRow[];
  offers: ContextEngineStoreOfferRow[];
} {
  const installedIds = new Set(readContextInstalledEngineIds(input));
  const records = readContextInstalledEngineRecords(input);

  const installed: ContextEngineStoreInstalledRow[] = [...installedIds]
    .map((engineId) => {
      const record = records.find((row) => row.engineId === engineId);
      const manifest = resolveStoreManifest({
        engineId,
        manifestId: record?.manifestId,
      });
      return {
        engineId,
        labelKo: formatInstalledEngineChipLabel(engineId),
        source: record?.source ?? "bootstrap",
        runState: readRimvioEngineRunState({ engineId, event: input.event }),
        provider: buildEngineStoreProviderMeta(manifest),
      };
    })
    .sort((left, right) => left.labelKo.localeCompare(right.labelKo, "ko"));

  const offers = buildContextEngineStoreOfferRows(input);

  return { installed, offers };
}
