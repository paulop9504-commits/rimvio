"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
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
  className?: string;
};

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn(rimvioEmptyStateClass(), "px-6 py-16 text-center")}>
      <p className={RIMVIO_TYPE.headline}>{title}</p>
      <p className={cn("mt-2", RIMVIO_TYPE.caption)}>{body}</p>
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
  className,
}: OpportunityDiscoveryFloorProps) {
  const copy = useCopy();
  const field = copy.globe.field;

  return (
    <section
      className={cn("flex min-h-0 flex-1 flex-col bg-[#f8f9fb]/40", className)}
      data-opportunity-discovery-floor
    >
      <div className="shrink-0 border-b border-[#eef1f4] bg-white px-4 pb-3 pt-2">
        <OpportunityOwnershipSectionLabel
          title={field.discoveryFloorTitle}
          hint={field.discoveryFloorHint}
          tone="neighbor"
        />
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#6b7684]">
          <Radio className="size-3.5 shrink-0 text-[#3182f6] animate-pulse" aria-hidden />
          {listeningLabel}
        </p>
      </div>

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

      <div className="min-h-0 flex-1 overflow-y-auto pb-[var(--rimvio-bottom-nav-offset)]">
        {loading ? (
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
    </section>
  );
}
