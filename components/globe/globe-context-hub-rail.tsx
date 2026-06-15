"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Car, Plane, Plus, Sparkles } from "lucide-react";
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
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubRailProps = {
  /** Only this context — hub panel never lists other contexts. */
  activeEventId?: string | null;
  visible?: boolean;
  className?: string;
};

const SERVICE_ICON: Record<ContextHubServiceId, typeof Plane> = {
  flight: Plane,
  rental_car: Car,
  ai_search: Sparkles,
};

function HubServiceRow({
  row,
  connectOpen,
  busy,
  onToggleConnect,
  onConnectFlight,
  onOpenAction,
}: {
  row: ContextHubServiceRow;
  connectOpen: boolean;
  busy: boolean;
  onToggleConnect: () => void;
  onConnectFlight: (airportId: DepartureHubAirportId) => void;
  onOpenAction: (url: string) => void;
}) {
  const Icon = SERVICE_ICON[row.serviceId];
  const link = row.link;

  return (
    <li className="relative">
      <div
        className={cn(
          "flex items-center gap-2 rounded-[1rem] border px-2 py-2",
          row.connected
            ? "border-primary/25 bg-primary/[0.06]"
            : "border-border/60 bg-card/90",
          !row.implemented && "opacity-55",
        )}
        data-globe-hub-service={row.serviceId}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            row.connected ? "bg-primary/15 text-primary" : "bg-muted/80 text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-foreground">{row.labelKo}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {!row.implemented
              ? copy.globe.contextHubServiceSoon
              : row.connected
                ? link?.shortLabel ?? copy.globe.contextHubDepartureKind
                : copy.globe.contextHubServicePlugIn}
          </p>
        </div>

        {row.implemented && row.serviceId === "flight" ? (
          row.connected && link?.actionUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpenAction(link.actionUrl!)}
              className="shrink-0 rounded-full bg-primary px-2 py-1 text-[9px] font-bold text-primary-foreground active:opacity-80"
              data-globe-hub-service-open={row.serviceId}
            >
              {link.actionLabelKo ?? link.airportIata ?? copy.globe.contextHubOpenFlight}
            </button>
          ) : row.connected ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground">
              {link?.shortLabel ?? copy.globe.contextHubDepartureKind}
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onToggleConnect}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-card text-primary active:scale-95",
                connectOpen && "border-primary bg-primary text-primary-foreground",
              )}
              aria-label={copy.globe.contextHubAdd}
              aria-expanded={connectOpen}
              data-globe-hub-service-add={row.serviceId}
            >
              <Plus className="size-3.5 stroke-[2.5]" aria-hidden />
            </button>
          )
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[8px] font-semibold text-muted-foreground">
            {copy.globe.contextHubServiceSoonBadge}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {connectOpen && row.flightOptions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-1 space-y-0.5 rounded-[0.85rem] border border-border/60 bg-card/95 p-1">
              {row.flightOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConnectFlight(option.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left active:bg-muted/70"
                    data-globe-hub-flight-option={option.id}
                  >
                    <span className="text-[11px] font-semibold">{option.shortLabelKo}</span>
                    {option.recommended ? (
                      <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[8px] font-bold text-primary">
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
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectServiceId, setConnectServiceId] = useState<ContextHubServiceId | null>(
    null,
  );

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

  useEffect(() => {
    void revision;
    const eventId = activeEventId?.trim();
    if (!eventId) {
      return;
    }
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      return;
    }
    const services = listContextHubServicesForEvent(event);
    const flight = services?.services.find(
      (row) => row.serviceId === "flight" && row.connected && row.link?.actionUrl,
    );
    if (flight?.link) {
      recordContextHubTelemetry({
        event,
        kind: "shown",
        label: flight.link.actionLabelKo ?? flight.link.shortLabel,
      });
    }
  }, [activeEventId, revision]);

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

  if (!visible || !panel) {
    return null;
  }

  return (
    <aside
      className={cn(
        "pointer-events-auto w-[7.75rem] overflow-hidden rounded-[1.25rem] border border-white/60 bg-card/88 shadow-[0_8px_32px_rgba(2,32,71,0.1)] backdrop-blur-xl ring-1 ring-border/50",
        className,
      )}
      data-globe-context-hub-rail
      aria-label={copy.globe.contextHubRailTitle}
    >
      <div className="border-b border-border/50 px-2.5 py-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
          {copy.globe.contextHubEyebrow}
        </p>
        <p className="text-[11px] font-semibold leading-tight text-foreground">
          {copy.globe.contextHubRailTitle}
        </p>
        <p
          className="mt-1 truncate text-[10px] font-medium text-muted-foreground"
          title={panel.contextPlace}
        >
          {copy.globe.contextHubRailForContext(panel.contextPlace)}
        </p>
      </div>

      <ul className="space-y-2 px-2 py-2.5">
        {panel.services.map((row) => (
          <HubServiceRow
            key={row.serviceId}
            row={row}
            connectOpen={connectServiceId === row.serviceId}
            busy={busy}
            onToggleConnect={() =>
              setConnectServiceId((current) =>
                current === row.serviceId ? null : row.serviceId,
              )
            }
            onConnectFlight={(airportId) => void handleConnectFlight(airportId)}
            onOpenAction={(url) => {
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
            }}
          />
        ))}
      </ul>
    </aside>
  );
}
