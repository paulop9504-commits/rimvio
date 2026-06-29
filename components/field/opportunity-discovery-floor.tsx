"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
import {
  FIELD_DASHBOARD_CANVAS,
  FIELD_DASHBOARD_CARD,
  FIELD_DASHBOARD_INSET,
} from "@/components/field/field-dashboard-layout";
import { OpportunityOwnershipSectionLabel } from "@/components/field/opportunity-ownership-section-label";
import { OpportunityPillBar } from "@/components/field/opportunity-pill-bar";
import {
  OpportunityRowItem,
  OpportunityRowShimmer,
} from "@/components/field/opportunity-row-item";
import { useCopy } from "@/hooks/use-copy";
import { RIMVIO_TYPE, rimvioEmptyStateClass } from "@/lib/design/rimvio-ontology";
import type { OpportunityPill, OpportunityRow } from "@/lib/globe/opportunity-field";
import { cn } from "@/lib/utils";

export type OpportunityDiscoveryFloorProps = {
  loading: boolean;
  pills: readonly OpportunityPill[];
  rows: readonly OpportunityRow[];
  selectedContextId: string | null;
  onSelectContext: (id: string) => void;
  listeningLabel: string;
  onRowPress: (row: OpportunityRow) => void;
  placeDiscovery?: ReactNode;
  lodgingDiscovery?: ReactNode;
  /** Inside tab panel — hides redundant section header. */
  embedded?: boolean;
  className?: string;
};

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn(rimvioEmptyStateClass(), "px-6 py-12 text-center")}>
      <p className={RIMVIO_TYPE.headline}>{title}</p>
      <p className={cn("mt-1.5", RIMVIO_TYPE.caption)}>{body}</p>
    </div>
  );
}

/** Real-time discovery layer — separate from transaction / 진행 중 거래. */
export function OpportunityDiscoveryFloor({
  loading,
  pills,
  rows,
  selectedContextId,
  onSelectContext,
  listeningLabel,
  onRowPress,
  placeDiscovery = null,
  lodgingDiscovery = null,
  embedded = false,
  className,
}: OpportunityDiscoveryFloorProps) {
  const copy = useCopy();
  const field = copy.globe.field;

  const scrollClass = cn(
    "min-h-0 flex-1 overflow-y-auto",
    embedded
      ? "pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      : "pb-[var(--rimvio-bottom-nav-offset)]",
  );

  const showInitialSkeleton = loading && pills.length === 0;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        embedded ? FIELD_DASHBOARD_CANVAS : "bg-[#f8f9fb]/40",
        className,
      )}
      data-opportunity-discovery-floor
    >
      {embedded ? (
        <div
          className={cn(
            "shrink-0 flex items-center gap-1.5 py-2",
            FIELD_DASHBOARD_INSET,
          )}
        >
          <Radio className="size-3 shrink-0 text-[#3182f6] animate-pulse" aria-hidden />
          <p className="truncate text-[12px] font-medium text-[#8b95a1]">{listeningLabel}</p>
        </div>
      ) : (
        <div
          className={cn(
            "shrink-0 border-b border-[#eef1f4] bg-white pb-2.5 pt-2",
            FIELD_DASHBOARD_INSET,
          )}
        >
          <OpportunityOwnershipSectionLabel
            title={field.discoveryFloorTitle}
            hint={field.discoveryFloorHint}
            tone="neighbor"
            className="px-0 pb-1 pt-0"
          />
          <p className="flex items-center gap-1.5 text-[12px] text-[#8b95a1]">
            <Radio className="size-3 shrink-0 text-[#3182f6] animate-pulse" aria-hidden />
            {listeningLabel}
          </p>
        </div>
      )}

      {embedded ? (
        <div className={scrollClass}>
          {pills.length > 0 ? (
            <div className={cn("mx-5 mb-2", FIELD_DASHBOARD_CARD)}>
              <OpportunityOwnershipSectionLabel
                title={field.mySeekingSection}
                hint={field.mySeekingHint}
                tone="mine"
                className="border-b border-[#f2f4f6] px-4 pb-2 pt-2.5"
              />
              <OpportunityPillBar
                pills={pills}
                selectedContextId={selectedContextId}
                onSelect={onSelectContext}
                pillAria={field.pillAria}
                minePillLabel={field.ownershipMinePill}
                className="border-0 bg-transparent px-3 pb-3 pt-2"
              />
            </div>
          ) : null}

          {placeDiscovery}
          {lodgingDiscovery}

          {showInitialSkeleton ? (
            <div className={cn("mx-5", FIELD_DASHBOARD_CARD)}>
              <OpportunityRowShimmer />
            </div>
          ) : pills.length === 0 ? (
            <EmptyBlock title={field.emptySeekingTitle} body={field.emptySeekingBody} />
          ) : rows.length === 0 ? (
            <EmptyBlock title={field.emptyRowsTitle} body={field.emptyRowsBody} />
          ) : (
            <div className={cn("mx-5", FIELD_DASHBOARD_CARD)}>
              <OpportunityOwnershipSectionLabel
                title={field.neighborListingsSection}
                hint={field.neighborListingsHint}
                tone="neighbor"
                className="border-b border-[#f2f4f6] px-4 pb-2 pt-2.5"
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.ul
                  key={selectedContextId ?? "none"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {rows.map((row, index) => (
                      <OpportunityRowItem
                        key={row.listingId}
                        row={row}
                        scoreAria={field.rowScoreAria}
                        previewFallback={field.tradeCta}
                        onPress={() => onRowPress(row)}
                        className={index === rows.length - 1 ? "border-b-0" : undefined}
                      />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : (
        <>
          {pills.length > 0 ? (
            <OpportunityOwnershipSectionLabel
              title={field.mySeekingSection}
              hint={field.mySeekingHint}
              tone="mine"
            />
          ) : null}
          <OpportunityPillBar
            pills={pills}
            selectedContextId={selectedContextId}
            onSelect={onSelectContext}
            pillAria={field.pillAria}
            minePillLabel={field.ownershipMinePill}
          />

          <div className={scrollClass}>
            {showInitialSkeleton ? (
              <OpportunityRowShimmer />
            ) : pills.length === 0 ? (
              <EmptyBlock title={field.emptySeekingTitle} body={field.emptySeekingBody} />
            ) : rows.length === 0 ? (
              <EmptyBlock title={field.emptyRowsTitle} body={field.emptyRowsBody} />
            ) : (
              <>
                <OpportunityOwnershipSectionLabel
                  title={field.neighborListingsSection}
                  hint={field.neighborListingsHint}
                  tone="neighbor"
                  className="bg-white"
                />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.ul
                    key={selectedContextId ?? "none"}
                    className="bg-white pt-0"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {rows.map((row) => (
                        <OpportunityRowItem
                          key={row.listingId}
                          row={row}
                          scoreAria={field.rowScoreAria}
                          previewFallback={field.tradeCta}
                          onPress={() => onRowPress(row)}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                </AnimatePresence>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
