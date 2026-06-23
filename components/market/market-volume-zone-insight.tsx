"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { fetchMarketVolumeZoneRollupRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import { formatMarketVolumeZoneCopy } from "@/lib/globe/market/price-guide/format-market-volume-zone-copy";
import { resolveMarketVolumeZone } from "@/lib/globe/market/price-guide/resolve-market-volume-zone";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketVolumeZoneInsightProps = {
  draft: MarketIntentDraft;
};

function readBatteryPercent(draft: MarketIntentDraft): number | null {
  const batteryRaw = draft.detail.prioritySlots.battery_health;
  if (typeof batteryRaw === "number" && Number.isFinite(batteryRaw)) {
    return Math.round(batteryRaw);
  }
  if (typeof batteryRaw === "string" && batteryRaw.trim()) {
    const parsed = Number.parseInt(batteryRaw.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function MarketVolumeZoneInsight({ draft }: MarketVolumeZoneInsightProps) {
  const productName = draft.detail.productName || draft.title;
  const batteryPercent = readBatteryPercent(draft);
  const [rollup, setRollup] = useState<{
    sampleCount: number;
    bandMinMan: number;
    bandMaxMan: number;
    anchorMan: number;
  } | null>(null);

  useEffect(() => {
    if (
      draft.categoryId !== "market.phone" ||
      !isValidMarketProductName(productName) ||
      batteryPercent === null
    ) {
      setRollup(null);
      return;
    }

    let cancelled = false;
    void fetchMarketVolumeZoneRollupRemote({
      productName,
      batteryPercent,
      categoryId: draft.categoryId,
    }).then((next) => {
      if (!cancelled) {
        setRollup(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [batteryPercent, draft.categoryId, productName]);

  const insight = useMemo(() => {
    const cosmeticRaw = draft.detail.prioritySlots.cosmetic_grade;
    const cosmeticGrade =
      typeof cosmeticRaw === "string" ? cosmeticRaw : draft.detail.conditionId;

    const zone = resolveMarketVolumeZone({
      productName,
      categoryId: draft.categoryId,
      batteryPercent,
      cosmeticGrade,
      role: draft.role,
      userPriceKrw: draft.priceMaxKrw ?? draft.priceMinKrw,
      rollup,
    });

    return formatMarketVolumeZoneCopy(zone, draft.role);
  }, [batteryPercent, draft, productName, rollup]);

  if (!insight) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2.5",
      )}
      aria-live="polite"
    >
      <p className={cn(RIMVIO_TYPE.caption, "font-semibold text-primary")}>
        {insight.eyebrow}
      </p>
      <p className="text-[13px] font-medium text-foreground">{insight.tierLine}</p>
      <p className="text-[13px] leading-snug text-foreground/90">{insight.body}</p>
      {insight.priceHint ? (
        <p className="text-[13px] font-medium leading-snug text-foreground">
          {insight.priceHint}
        </p>
      ) : null}
      <p className={cn(RIMVIO_TYPE.caption, "text-muted-foreground")}>
        {insight.disclaimer}
      </p>
    </div>
  );
}
