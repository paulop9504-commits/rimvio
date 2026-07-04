"use client";

import { useMemo, useState } from "react";
import type {
  ContextHubServiceId,
  ContextHubServiceRow,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { HubServiceSlot } from "@/components/globe/globe-context-hub-service-slot";

export type GlobeHubServiceListProps = {
  rows: readonly ContextHubServiceRow[];
  busy: boolean;
  connectServiceId: ContextHubServiceId | null;
  emphasizedServiceId?: ContextHubServiceId | null;
  initialVisibleCount?: number;
  className?: string;
  onToggleConnect: (row: ContextHubServiceRow) => void;
  onConnectFlight: (airportId: DepartureHubAirportId) => void;
  onConnectLodging?: () => void;
  onConnectMarket?: () => void;
  onOpenAction: (url: string, label: string) => void;
  onOpenHandoff: (href: string, label: string, internalRoute?: boolean) => void;
};

export function GlobeHubServiceList({
  rows,
  busy,
  connectServiceId,
  emphasizedServiceId = null,
  initialVisibleCount = 3,
  className,
  onToggleConnect,
  onConnectFlight,
  onConnectLodging,
  onConnectMarket,
  onOpenAction,
  onOpenHandoff,
}: GlobeHubServiceListProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const visibilityKey = `${initialVisibleCount}:${rows.map((row) => row.serviceId).join("|")}`;
  const hiddenRows = rows.slice(initialVisibleCount);
  const autoExpanded = hiddenRows.some(
    (row) =>
      row.serviceId === connectServiceId ||
      row.serviceId === emphasizedServiceId,
  );
  const showAll = autoExpanded || expandedKey === visibilityKey;

  const visibleRows = useMemo(
    () => (showAll ? rows : rows.slice(0, initialVisibleCount)),
    [initialVisibleCount, rows, showAll],
  );

  const hiddenCount = Math.max(0, rows.length - visibleRows.length);

  return (
    <div className={cn("space-y-2", className)} data-globe-hub-service-list>
      <ul className="space-y-1.5">
        {visibleRows.map((row) => (
          <HubServiceSlot
            key={row.serviceId}
            row={row}
            connectOpen={connectServiceId === row.serviceId}
            busy={busy}
            emphasized={row.serviceId === emphasizedServiceId}
            onToggleConnect={() => onToggleConnect(row)}
            onConnectFlight={onConnectFlight}
            onConnectLodging={onConnectLodging}
            onConnectMarket={onConnectMarket}
            onOpenAction={onOpenAction}
            onOpenHandoff={onOpenHandoff}
          />
        ))}
      </ul>
      {rows.length > initialVisibleCount ? (
        <button
          type="button"
          onClick={() =>
            setExpandedKey((current) =>
              current === visibilityKey ? null : visibilityKey,
            )
          }
          className="flex items-center gap-2 rounded-full px-1.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
          data-globe-hub-service-list-toggle={showAll ? "collapse" : "expand"}
        >
          <span>
            {showAll
              ? copy.globe.contextHubCollapseAria
              : copy.globe.contextHubShowMore(hiddenCount)}
          </span>
        </button>
      ) : null}
    </div>
  );
}
