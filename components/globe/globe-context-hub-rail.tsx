"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Car, ChevronDown, Plane, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import {
  foldContextHubLearning,
  recordContextHubTelemetry,
} from "@/lib/globe/context-hub/record-context-hub-telemetry";
import {
  listContextHubServicesForEvent,
  type ContextHubServiceId,
  type ContextHubServiceRow,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import { resolvePrimaryHubServiceRow } from "@/lib/globe/context-hub/resolve-primary-hub-service";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import {
  resolvePinScopeFromEventId,
  writeGlobeOrchestratorScopeHint,
} from "@/lib/globe/globe-orchestrator-scope-bridge";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubRailProps = {
  activeEventId?: string | null;
  visible?: boolean;
  className?: string;
};

const SERVICE_ICON: Record<ContextHubServiceId, typeof Plane> = {
  flight: Plane,
  rental_car: Car,
  ai_search: Sparkles,
};

const PANEL_WIDTH =
  "w-[min(calc(100vw-1.5rem),17.5rem)]";

function resolveSlotSubtitle(row: ContextHubServiceRow): string {
  const link = row.link;
  if (!row.implemented) {
    return copy.globe.contextHubServiceSoon;
  }
  if (row.connected) {
    return link?.shortLabel ?? link?.label ?? copy.globe.contextHubDepartureKind;
  }
  if (row.serviceId === "ai_search") {
    return copy.globe.contextHubAiSearchOpen;
  }
  return copy.globe.contextHubServicePlugIn;
}

function resolvePrimaryLabel(row: ContextHubServiceRow): string {
  if (row.connected && row.link?.actionLabelKo) {
    return row.link.actionLabelKo;
  }
  if (row.connected && row.link?.shortLabel) {
    return row.link.shortLabel;
  }
  if (row.handoffLabelKo) {
    return row.handoffLabelKo;
  }
  return row.labelKo;
}

function HubServiceSlot({
  row,
  connectOpen,
  busy,
  emphasized,
  onToggleConnect,
  onConnectFlight,
  onOpenAction,
  onOpenHandoff,
}: {
  row: ContextHubServiceRow;
  connectOpen: boolean;
  busy: boolean;
  emphasized?: boolean;
  onToggleConnect: () => void;
  onConnectFlight: (airportId: DepartureHubAirportId) => void;
  onOpenAction: (url: string) => void;
  onOpenHandoff: (href: string) => void;
}) {
  const Icon = SERVICE_ICON[row.serviceId];
  const link = row.link;
  const subtitle = resolveSlotSubtitle(row);

  const cta = (() => {
    if (!row.implemented) {
      return (
        <span className="shrink-0 rounded-full bg-muted/90 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          {copy.globe.contextHubServiceSoonBadge}
        </span>
      );
    }

    if (row.serviceId === "ai_search" && row.handoffHref) {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => onOpenHandoff(row.handoffHref!)}
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm active:opacity-85"
          data-globe-hub-service-open={row.serviceId}
        >
          {row.handoffLabelKo ?? copy.globe.contextHubAiSearchOpen}
        </button>
      );
    }

    if (row.serviceId === "flight") {
      if (row.connected && link?.actionUrl) {
        return (
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenAction(link.actionUrl!)}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm active:opacity-85"
            data-globe-hub-service-open={row.serviceId}
          >
            {link.actionLabelKo ?? copy.globe.contextHubOpenFlight}
          </button>
        );
      }
      if (row.connected) {
        return (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            {link?.shortLabel ?? copy.globe.contextHubDepartureKind}
          </span>
        );
      }
      return (
        <button
          type="button"
          disabled={busy}
          onClick={onToggleConnect}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card text-primary shadow-sm active:scale-95",
            connectOpen && "border-primary bg-primary text-primary-foreground",
          )}
          aria-label={copy.globe.contextHubAdd}
          aria-expanded={connectOpen}
          data-globe-hub-service-add={row.serviceId}
        >
          <Plus className="size-4 stroke-[2.5]" aria-hidden />
        </button>
      );
    }

    return (
      <span className="shrink-0 rounded-full bg-muted/90 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
        {copy.globe.contextHubServiceSoonBadge}
      </span>
    );
  })();

  return (
    <li className="relative">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
          row.connected || emphasized
            ? "border-primary/20 bg-primary/[0.05] shadow-[0_1px_0_rgba(49,130,246,0.06)]"
            : "border-border/50 bg-card/95",
          !row.implemented && "opacity-60",
        )}
        data-globe-hub-service={row.serviceId}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            row.connected || emphasized
              ? "bg-primary/12 text-primary"
              : "bg-muted/70 text-muted-foreground",
          )}
        >
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {row.labelKo}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {cta}
      </div>

      <AnimatePresence initial={false}>
        {connectOpen && row.flightOptions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-1.5 space-y-1 rounded-xl border border-border/50 bg-muted/20 p-1">
              {row.flightOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConnectFlight(option.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left active:bg-card/90"
                    data-globe-hub-flight-option={option.id}
                  >
                    <span className="text-[12px] font-semibold text-foreground">
                      {option.shortLabelKo}
                    </span>
                    {option.recommended ? (
                      <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[9px] font-bold text-primary">
                        {copy.globe.departureHubRecommended}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export function GlobeContextHubRail({
  activeEventId,
  visible = true,
  className,
}: GlobeContextHubRailProps) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectServiceId, setConnectServiceId] = useState<ContextHubServiceId | null>(
    null,
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [activeEventId]);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    };
  }, []);

  useEffect(() => {
    setConnectServiceId(null);
  }, [activeEventId]);

  const panel = useMemo(() => {
    void revision;
    const eventId = activeEventId?.trim();
    if (!eventId) {
      return null;
    }
    const event = findLifeEventCandidate(eventId);
    return listContextHubServicesForEvent(event);
  }, [activeEventId, revision]);

  const primaryRow = useMemo(
    () => (panel ? resolvePrimaryHubServiceRow(panel.services) : null),
    [panel],
  );

  const handleOpenAction = useCallback(
    (url: string) => {
      const eventId = activeEventId?.trim();
      const event = eventId ? findLifeEventCandidate(eventId) : null;
      if (event) {
        recordContextHubTelemetry({
          event,
          kind: "clicked",
          label: copy.globe.contextHubOpenFlight,
        });
        recordContextHubTelemetry({
          event,
          kind: "executed",
          label: copy.globe.contextHubOpenFlight,
        });
        foldContextHubLearning(event);
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [activeEventId],
  );

  useEffect(() => {
    void revision;
    const eventId = activeEventId?.trim();
    if (!eventId || !primaryRow) {
      return;
    }
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      return;
    }
    recordContextHubTelemetry({
      event,
      kind: "shown",
      label: resolvePrimaryLabel(primaryRow),
    });
  }, [activeEventId, primaryRow, revision]);

  const handleConnectFlight = useCallback(
    async (airportId: DepartureHubAirportId) => {
      const eventId = activeEventId?.trim();
      if (!eventId || busy) {
        return;
      }
      const event = findLifeEventCandidate(eventId);
      setBusy(true);
      try {
        connectDepartureHubToContext({
          destinationEventId: eventId,
          airportId,
        });
        if (event) {
          recordContextHubTelemetry({
            event,
            kind: "clicked",
            label: airportId,
          });
          foldContextHubLearning(event);
        }
        const label =
          panel?.services
            .find((row) => row.serviceId === "flight")
            ?.flightOptions.find((row) => row.id === airportId)?.shortLabelKo ?? airportId;
        toast.success(copy.globe.departureHubConnected(label));
        setConnectServiceId(null);
        setRevision((value) => value + 1);
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : copy.globe.departureHubConnectFail,
        );
      } finally {
        setBusy(false);
      }
    },
    [activeEventId, busy, panel?.services],
  );

  const handleOpenHandoff = useCallback(
    (href: string) => {
      const eventId = activeEventId?.trim();
      const event = eventId ? findLifeEventCandidate(eventId) : null;
      if (event) {
        writeGlobeOrchestratorScopeHint({
          pinScope: resolvePinScopeFromEventId(eventId) ?? "internal",
          eventId,
          title: event.title,
        });
        recordContextHubTelemetry({
          event,
          kind: "clicked",
          label: copy.globe.contextHubAiSearchOpen,
        });
        recordContextHubTelemetry({
          event,
          kind: "executed",
          label: copy.globe.contextHubAiSearchOpen,
        });
        foldContextHubLearning(event);
      }
      router.push(href);
    },
    [activeEventId, router],
  );

  const runPrimaryRow = useCallback(
    (row: ContextHubServiceRow) => {
      if (row.connected && row.link?.actionUrl) {
        handleOpenAction(row.link.actionUrl);
        return;
      }
      if (row.handoffHref) {
        handleOpenHandoff(row.handoffHref);
        return;
      }
      setExpanded(true);
      setConnectServiceId(row.serviceId);
    },
    [handleOpenAction, handleOpenHandoff],
  );

  if (!visible || !panel) {
    return null;
  }

  const chipRow = primaryRow;
  const ChipIcon = chipRow ? SERVICE_ICON[chipRow.serviceId] : Sparkles;

  if (!expanded) {
    return (
      <aside
        className={cn(
          "pointer-events-auto overflow-hidden rounded-full border border-border/60 bg-card/95 shadow-[0_8px_28px_rgba(2,32,71,0.08)] backdrop-blur-xl",
          PANEL_WIDTH,
          className,
        )}
        data-globe-context-hub-rail
        data-globe-context-hub-rail-expanded="false"
        aria-label={copy.globe.contextHubRailTitle}
      >
        <div className="flex items-center gap-1 p-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (chipRow) {
                runPrimaryRow(chipRow);
                return;
              }
              setExpanded(true);
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-2.5 py-2 text-left active:bg-muted/50"
            data-globe-hub-primary={chipRow?.serviceId ?? "resources"}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChipIcon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-foreground">
                {chipRow ? resolvePrimaryLabel(chipRow) : copy.globe.contextHubRailTitle}
              </span>
              {chipRow ? (
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {resolveSlotSubtitle(chipRow)}
                </span>
              ) : null}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full active:bg-muted/60"
            aria-expanded={false}
            aria-label={copy.globe.contextHubExpandAria}
            data-globe-hub-rail-expand
          >
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "pointer-events-auto overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/95 shadow-[0_12px_40px_rgba(2,32,71,0.12)] backdrop-blur-xl",
        PANEL_WIDTH,
        className,
      )}
      data-globe-context-hub-rail
      data-globe-context-hub-rail-expanded="true"
      aria-label={copy.globe.contextHubRailTitle}
    >
      <div className="flex items-start gap-2 border-b border-border/50 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            {copy.globe.contextHubEyebrow}
          </p>
          <p className="text-[14px] font-semibold leading-tight text-foreground">
            {copy.globe.contextHubRailTitle}
          </p>
          <p
            className="mt-1 truncate text-[11px] font-medium text-muted-foreground"
            title={panel.contextPlace}
          >
            {copy.globe.contextHubRailForContext(panel.contextPlace)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 active:bg-muted"
          aria-expanded
          aria-label={copy.globe.contextHubCollapseAria}
          data-globe-hub-rail-collapse
        >
          <ChevronDown className="size-4 rotate-180 text-muted-foreground" aria-hidden />
        </button>
      </div>

      <ul className="space-y-2 px-2.5 py-2.5">
        {panel.services.map((row) => (
          <HubServiceSlot
            key={row.serviceId}
            row={row}
            connectOpen={connectServiceId === row.serviceId}
            busy={busy}
            emphasized={primaryRow?.serviceId === row.serviceId}
            onToggleConnect={() =>
              setConnectServiceId((current) =>
                current === row.serviceId ? null : row.serviceId,
              )
            }
            onConnectFlight={(airportId) => void handleConnectFlight(airportId)}
            onOpenAction={handleOpenAction}
            onOpenHandoff={handleOpenHandoff}
          />
        ))}
      </ul>
    </aside>
  );
}
