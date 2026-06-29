"use client";

import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { MarketIntentOwnershipChip } from "@/components/market/market-intent-ownership-chip";
import { useCopy } from "@/hooks/use-copy";
import { useMarketManageIntents } from "@/hooks/use-market-manage-intents";
import { useRegionalProfile } from "@/hooks/use-regional-profile";
import {
  FIELD_DASHBOARD_CANVAS,
  FIELD_DASHBOARD_INSET,
} from "@/components/field/field-dashboard-layout";
import { RIMVIO_TYPE, rimvioEmptyStateClass, rimvioGhostCtaClass } from "@/lib/design/rimvio-ontology";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import { formatMarketPriceLine } from "@/lib/globe/market/format-market-price-line";
import { formatMarketPlaceLabel } from "@/lib/globe/market/format-market-place-label";
import { publishMarketIntentExternal } from "@/lib/globe/market/publish-market-intent-external";
import { cn } from "@/lib/utils";

export type FieldExternalMinePanelProps = {
  enabled: boolean;
  onFlyToIntent?: (record: MarketIntentRecord) => void;
  className?: string;
};

function MineIntentRow({
  record,
  onFlyTo,
  onEnd,
  onPublish,
}: {
  record: MarketIntentRecord;
  onFlyTo: () => void;
  onEnd: () => void;
  onPublish: () => void;
}) {
  const copy = useCopy();
  const { profile } = useRegionalProfile();
  const published = isMarketIntentPublishedExternal(record.detail);
  const title =
    record.detail.productName.trim() ||
    record.title.trim() ||
    copy.globe.marketTradePlaceProductFallback;

  return (
    <div
      className={cn(
        "rounded-2xl border-l-[3px] px-3 py-3 ring-1 ring-[#eef1f4]",
        record.role === "listing" ? "border-l-[#2b7fff]" : "border-l-[#ef2b2b]",
        published ? "bg-white shadow-sm" : "bg-[#f8f9fb]",
      )}
      data-field-mine-row={record.eventId}
      data-field-mine-role={record.role}
      data-field-mine-published={published ? "true" : "false"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <MarketIntentOwnershipChip
          kind={published ? "mine-external" : "mine-internal"}
          label={
            published
              ? copy.globe.ownershipMineExternal
              : copy.globe.ownershipMineInternal
          }
          size="xs"
        />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
            record.role === "listing" ? "bg-[#2b7fff]" : "bg-[#ef2b2b]",
          )}
        >
          {record.role === "listing"
            ? copy.globe.marketPinRoleListing
            : copy.globe.marketPinRoleSeeking}
        </span>
      </div>
      <p className="mt-2 truncate text-[15px] font-semibold text-[#191f28]">{title}</p>
      <p className="mt-0.5 text-[12px] text-[#8b95a1]">
        {marketCategoryLabelKo(record.categoryId)} ·{" "}
        {formatMarketPriceLine(record.priceMinKrw, record.priceMaxKrw, profile)}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[12px] text-[#8b95a1]">
        <MapPin className="size-3.5 shrink-0 text-[#3182f6]" aria-hidden />
        <span className="truncate">
          {formatMarketPlaceLabel(record.placeLabel) || copy.globe.marketIntentPrefillHint}
        </span>
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          className={cn(rimvioGhostCtaClass(), "flex-1 text-[12px]")}
          onClick={onFlyTo}
        >
          {copy.globe.marketManageFlyTo}
        </button>
        {!published ? (
          <button
            type="button"
            className={cn(rimvioGhostCtaClass(), "flex-1 text-[12px] font-semibold text-[#3182f6]")}
            onClick={onPublish}
          >
            {copy.globe.marketManagePublishCta}
          </button>
        ) : null}
        <button
          type="button"
          className={cn(rimvioGhostCtaClass(), "flex-1 text-[12px] text-[#8b95a1]")}
          onClick={onEnd}
        >
          {copy.globe.marketManageEndCta}
        </button>
      </div>
    </div>
  );
}

function RoleBlock({
  title,
  pillClass,
  emptyLabel,
  rows,
  onFlyTo,
  onEnd,
  onPublish,
}: {
  title: string;
  pillClass: string;
  emptyLabel: string;
  rows: readonly MarketIntentRecord[];
  onFlyTo: (record: MarketIntentRecord) => void;
  onEnd: (record: MarketIntentRecord) => void;
  onPublish: (record: MarketIntentRecord) => void;
}) {
  return (
    <section className="space-y-3" data-field-mine-section={title}>
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold text-white", pillClass)}>
          {title}
        </span>
        <span className="text-[12px] text-[#8b95a1]">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-[#f8f9fb] px-3 py-4 text-center text-[13px] text-[#8b95a1]">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((record) => (
            <MineIntentRow
              key={record.eventId}
              record={record}
              onFlyTo={() => onFlyTo(record)}
              onEnd={() => onEnd(record)}
              onPublish={() => onPublish(record)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** 내가 밖 지구에 올린 구하기/내놓기 — Field dashboard SSOT (no separate manage sheet). */
export function FieldExternalMinePanel({
  enabled,
  onFlyToIntent,
  className,
}: FieldExternalMinePanelProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const { listings, seekings, loading, endIntent } = useMarketManageIntents(enabled);

  const handleEnd = (record: MarketIntentRecord) => {
    void endIntent(record.eventId).then(() => {
      toast.message(copy.globe.marketManageEndedToast);
    });
  };

  const handlePublish = (record: MarketIntentRecord) => {
    void publishMarketIntentExternal(record.eventId).then((saved) => {
      if (saved) {
        toast.success(copy.globe.marketManagePublishedToast);
      }
    });
  };

  if (loading) {
    return (
      <div className={cn("flex flex-1 items-center justify-center py-12", FIELD_DASHBOARD_CANVAS, className)}>
        <p className="text-[13px] text-[#8b95a1]">{copy.globe.marketTradePlaceResolving}</p>
      </div>
    );
  }

  const all = [...seekings, ...listings];
  if (all.length === 0) {
    return (
      <div
        className={cn(rimvioEmptyStateClass(), "flex flex-1 flex-col justify-center px-8 py-12 text-center", className)}
        data-field-mine-empty
      >
        <p className={RIMVIO_TYPE.headline}>{field.mineEmptyTitle}</p>
        <p className={cn("mt-1.5", RIMVIO_TYPE.caption)}>{field.mineEmptyBody}</p>
      </div>
    );
  }

  const externalCount = all.filter((row) => isMarketIntentPublishedExternal(row.detail)).length;

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
        FIELD_DASHBOARD_CANVAS,
        FIELD_DASHBOARD_INSET,
        className,
      )}
      data-field-external-mine-panel
    >
      <p className="mb-4 text-[12px] text-[#8b95a1]">
        {copy.globe.marketManageStatsSummary(externalCount, all.length - externalCount)}
      </p>
      <div className="space-y-6">
        <RoleBlock
          title={copy.globe.marketManageSeekingSection}
          pillClass="bg-[#ef2b2b]"
          emptyLabel={copy.globe.marketManageEmptySeeking}
          rows={seekings}
          onFlyTo={(record) => onFlyToIntent?.(record)}
          onEnd={handleEnd}
          onPublish={handlePublish}
        />
        <RoleBlock
          title={copy.globe.marketManageListingSection}
          pillClass="bg-[#2b7fff]"
          emptyLabel={copy.globe.marketManageEmptyListing}
          rows={listings}
          onFlyTo={(record) => onFlyToIntent?.(record)}
          onEnd={handleEnd}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
