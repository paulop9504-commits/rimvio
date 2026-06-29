"use client";

import { OpportunityOwnershipSectionLabel } from "@/components/field/opportunity-ownership-section-label";
import { FIELD_DASHBOARD_CARD, FIELD_DASHBOARD_INSET } from "@/components/field/field-dashboard-layout";
import { useCopy } from "@/hooks/use-copy";
import type { ScoredFieldLodgingRow } from "@/lib/globe/opportunity-field/score-field-lodging-rows";
import { formatFieldLodgingPriceLine } from "@/lib/globe/opportunity-field/score-field-lodging-rows";
import { cn } from "@/lib/utils";

export type FieldLodgingDiscoverySectionProps = {
  loading: boolean;
  rows: readonly ScoredFieldLodgingRow[];
  source?: string | null;
  className?: string;
};

function LodgingRow({ entry }: { entry: ScoredFieldLodgingRow }) {
  const priceLine = formatFieldLodgingPriceLine(entry.row.priceKrw);

  return (
    <li className="border-b border-[#f2f4f6] px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#191f28]">
            {entry.row.name}
          </p>
          <p className="mt-0.5 text-[12px] text-[#6b7684]">{entry.reasonKo}</p>
          {entry.matchReasons.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {entry.matchReasons.slice(0, 2).map((line) => (
                <li key={line} className="text-[11px] text-[#8b95a1]">
                  · {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          {priceLine ? (
            <p className="text-[13px] font-semibold tabular-nums text-[#191f28]">
              {priceLine}
            </p>
          ) : null}
          {entry.distanceKm != null ? (
            <p className="mt-0.5 text-[11px] tabular-nums text-[#8b95a1]">
              {entry.distanceKm < 1
                ? "1km 이내"
                : `${entry.distanceKm.toFixed(1)}km`}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** GPS lodging inventory on Field discovery — market-price + reason cards. */
export function FieldLodgingDiscoverySection({
  loading,
  rows,
  source,
  className,
}: FieldLodgingDiscoverySectionProps) {
  const copy = useCopy();
  const field = copy.globe.field;

  return (
    <div className={cn("mx-5 mb-3", FIELD_DASHBOARD_CARD, className)}>
      <OpportunityOwnershipSectionLabel
        title={field.lodgingDiscoverySection}
        hint={field.lodgingDiscoveryHint}
        tone="neighbor"
        className="border-b border-[#f2f4f6] px-4 pb-2 pt-2.5"
      />
      <div className={cn("py-1", FIELD_DASHBOARD_INSET)}>
        {loading ? (
          <div className="space-y-2 px-4 py-3">
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-[#f2f4f6]" />
            <div className="h-16 animate-pulse rounded-xl bg-[#f2f4f6]" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-[#8b95a1]">
            {field.lodgingDiscoveryEmpty}
          </p>
        ) : (
          <>
            <ul>
              {rows.map((entry) => (
                <LodgingRow key={entry.row.placeId} entry={entry} />
              ))}
            </ul>
            {source ? (
              <p className="px-4 pb-2 text-[10px] text-[#b0b8c1]">source · {source}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
