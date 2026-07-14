"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { installEngineManifestToContextClient } from "@/lib/engine/install-context-engine-client";
import { hydrateProviderMemberRegistryClient } from "@/lib/marketplace/hydrate-provider-member-registry-client";
import type { RimvioEngineRunState } from "@/lib/engine/engine-types";
import {
  buildContextEngineStoreRows,
  filterContextEngineStoreOffers,
  type ContextEngineStoreInstalledRow,
  type ContextEngineStoreOfferRow,
  type ContextEngineStoreProviderMeta,
} from "@/lib/globe/context-hub/build-context-engine-store-rows";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { cn } from "@/lib/utils";

export type GlobeContextHubEngineStripProps = {
  contextEventId: string;
  event: EventCandidate | null;
  blueprint?: ContextBlueprint | null;
  compact?: boolean;
  className?: string;
  onChanged?: () => void;
};

function runStateDotClass(state: RimvioEngineRunState): string {
  switch (state) {
    case "prepared":
    case "awaiting_approval":
    case "committed":
      return "bg-[#34c759]";
    case "scouting":
    case "planning":
      return "bg-[#ff9500]";
    default:
      return "bg-[#c7c7cc]";
  }
}

function ProviderMetaCaption({
  provider,
  compact,
}: {
  provider: ContextEngineStoreProviderMeta;
  compact?: boolean;
}) {
  const caption = provider.providerKindLabelKo
    ? `${provider.providerMemberLabelKo} · ${provider.providerKindLabelKo}`
    : provider.providerMemberLabelKo;

  return (
    <span
      className={cn(
        "font-normal text-[#8e8e93]",
        compact ? "text-[8px]" : "text-[9px]",
      )}
    >
      {caption}
    </span>
  );
}

function InstalledEngineChip({
  row,
  compact,
}: {
  row: ContextEngineStoreInstalledRow;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[#f2f2f7] font-medium text-[#3a3a3c]",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      )}
      data-engine-chip={row.engineId}
      title={row.provider?.providerMemberId}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", runStateDotClass(row.runState))}
        aria-hidden
      />
      <span className="inline-flex items-baseline gap-1">
        <span>{row.labelKo}</span>
        {row.provider ? (
          <ProviderMetaCaption provider={row.provider} compact={compact} />
        ) : null}
      </span>
    </span>
  );
}

function MarketplaceOfferChip({
  offer,
  busy,
  onInstall,
}: {
  offer: ContextEngineStoreOfferRow;
  busy: boolean;
  onInstall: (manifestId: string, labelKo: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onInstall(offer.manifestId, offer.labelKo)}
      className={cn(
        "inline-flex flex-col items-start rounded-full border border-dashed border-[#0071e3]/40 px-2.5 py-1 text-left",
        "active:scale-[0.98] disabled:opacity-50",
      )}
      title={offer.description}
      data-engine-offer={offer.manifestId}
      data-provider-kind={offer.provider.providerKind ?? "unknown"}
      data-provider-member={offer.provider.providerMemberId}
    >
      <span className="text-[11px] font-medium text-[#0071e3]">
        {copy.globe.engineStore.installOffer(offer.labelKo)}
      </span>
      <ProviderMetaCaption provider={offer.provider} />
    </button>
  );
}

/** Installed Engine packages + Marketplace install offers on Context hub. */
export function GlobeContextHubEngineStrip({
  contextEventId,
  event,
  blueprint = null,
  compact = false,
  className,
  onChanged,
}: GlobeContextHubEngineStripProps) {
  const [offersOpen, setOffersOpen] = useState(false);
  const [offerFilter, setOfferFilter] = useState<"all" | "partner">("all");
  const [busyManifestId, setBusyManifestId] = useState<string | null>(null);
  const [providerRegistryRevision, setProviderRegistryRevision] = useState(0);

  useEffect(() => {
    void hydrateProviderMemberRegistryClient().then((hydrated) => {
      if (hydrated) {
        setProviderRegistryRevision((value) => value + 1);
      }
    });
  }, []);

  const { installed, offers } = useMemo(
    () => buildContextEngineStoreRows({ event, blueprint }),
    [blueprint, event, providerRegistryRevision],
  );

  const partnerOffers = useMemo(
    () => filterContextEngineStoreOffers(offers, { partnerOnly: true }),
    [offers],
  );

  const visibleOffers = useMemo(
    () =>
      offerFilter === "partner"
        ? filterContextEngineStoreOffers(offers, { partnerOnly: true })
        : offers,
    [offerFilter, offers],
  );

  const showPartnerFilter = partnerOffers.length > 0 && offers.length > partnerOffers.length;

  const handleInstall = useCallback(
    async (manifestId: string, labelKo: string) => {
      if (busyManifestId) {
        return;
      }
      setBusyManifestId(manifestId);
      try {
        const result = installEngineManifestToContextClient({
          contextEventId,
          manifestId,
        });
        if (!result.ok) {
          return;
        }
        if (!result.alreadyInstalled) {
          toast.success(copy.globe.engineStore.installDone(labelKo));
          onChanged?.();
        }
        setOffersOpen(false);
      } finally {
        setBusyManifestId(null);
      }
    },
    [busyManifestId, contextEventId, onChanged],
  );

  if (installed.length === 0 && offers.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-black/[0.05]",
        className,
      )}
      data-globe-context-hub-engine-strip
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
          {copy.globe.engineStore.title}
        </p>
        {offers.length > 0 ? (
          <button
            type="button"
            onClick={() => setOffersOpen((value) => !value)}
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#0071e3] active:opacity-70"
          >
            <Plus className="size-3" aria-hidden />
            {copy.globe.engineStore.add}
          </button>
        ) : null}
      </div>

      {installed.length > 0 ? (
        <div className={cn("mt-1.5 flex flex-wrap gap-1", compact && "gap-0.5")}>
          {installed.map((row) => (
            <InstalledEngineChip key={row.engineId} row={row} compact={compact} />
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-[#8e8e93]">{copy.globe.engineStore.empty}</p>
      )}

      {offersOpen && offers.length > 0 ? (
        <div className="mt-2 border-t border-black/[0.05] pt-2">
          {showPartnerFilter ? (
            <div className="mb-1.5 flex gap-1">
              <button
                type="button"
                onClick={() => setOfferFilter("all")}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  offerFilter === "all"
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#f2f2f7] text-[#8e8e93]",
                )}
              >
                {copy.globe.engineStore.filterAll}
              </button>
              <button
                type="button"
                onClick={() => setOfferFilter("partner")}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  offerFilter === "partner"
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#f2f2f7] text-[#8e8e93]",
                )}
              >
                {copy.globe.engineStore.filterPartner}
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {visibleOffers.map((offer) => (
              <MarketplaceOfferChip
                key={offer.manifestId}
                offer={offer}
                busy={busyManifestId === offer.manifestId}
                onInstall={(manifestId, labelKo) => void handleInstall(manifestId, labelKo)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
