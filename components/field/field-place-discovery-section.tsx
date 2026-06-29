"use client";

import { PlaceDiscoveryCards } from "@/components/action-chat/place-discovery-cards";
import { OpportunityOwnershipSectionLabel } from "@/components/field/opportunity-ownership-section-label";
import { FIELD_DASHBOARD_CARD, FIELD_DASHBOARD_INSET } from "@/components/field/field-dashboard-layout";
import { useCopy } from "@/hooks/use-copy";
import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";
import { cn } from "@/lib/utils";

export type FieldPlaceDiscoverySectionProps = {
  loading: boolean;
  summary: string | null;
  wire: CafeDiscoveryWire | null;
  query: string | null;
  className?: string;
};

/** GPS place-search cards on Field discovery tab — dev API, product surface. */
export function FieldPlaceDiscoverySection({
  loading,
  summary,
  wire,
  query,
  className,
}: FieldPlaceDiscoverySectionProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const hasCards = Boolean(wire?.options?.length);

  if (!query) {
    return null;
  }

  return (
    <div className={cn("mx-5 mb-3", FIELD_DASHBOARD_CARD, className)}>
      <OpportunityOwnershipSectionLabel
        title={field.placeDiscoverySection}
        hint={field.placeDiscoveryHint}
        tone="neighbor"
        className="border-b border-[#f2f4f6] px-4 pb-2 pt-2.5"
      />
      <div className={cn("px-4 py-3", FIELD_DASHBOARD_INSET)}>
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-[#f2f4f6]" />
            <div className="h-36 animate-pulse rounded-2xl bg-[#f2f4f6]" />
          </div>
        ) : hasCards && wire ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-[#4e5968]">
              {summary ?? wire.summary}
            </p>
            <PlaceDiscoveryCards wire={wire} className="w-full" />
          </div>
        ) : (
          <p className="text-[13px] text-[#8b95a1]">{field.placeDiscoveryEmpty}</p>
        )}
      </div>
    </div>
  );
}
