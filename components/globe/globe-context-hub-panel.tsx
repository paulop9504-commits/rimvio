"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HubServiceSlot } from "@/components/globe/globe-context-hub-service-slot";
import { GlobeContextTicketConnectSheet } from "@/components/globe/globe-context-ticket-connect-sheet";
import { GlobeTicketQrViewer } from "@/components/globe/globe-ticket-qr-viewer";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import { enableLodgingHubForContext } from "@/lib/globe/context-hub/enable-lodging-hub-for-context";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { rankContextHubServices } from "@/lib/globe/context-hub/rank-context-hub-services";
import {
  foldContextHubLearning,
  recordContextHubTelemetry,
} from "@/lib/globe/context-hub/record-context-hub-telemetry";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import {
  resolvePinScopeFromEventId,
  writeGlobeOrchestratorScopeHint,
} from "@/lib/globe/globe-orchestrator-scope-bridge";
import { isTicketQrViewerHref } from "@/lib/globe/ticket-scan-surface";
import { resolveSemanticMainHintForEvent } from "@/lib/semantic/resolve-semantic-main-hint-for-event";
import { copy } from "@/lib/copy/human-ko";

export type GlobeContextHubPanelProps = {
  event: EventCandidate;
  destinationLabel?: string | null;
  homeRegionHint?: string | null;
  lat?: number | null;
  lng?: number | null;
  onUpdated?: () => void;
};

function openExternalHref(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

/** Context sheet / bridge — plug flight · lodging · ticket · AI search into one context. */
export function GlobeContextHubPanel({
  event,
  destinationLabel,
  homeRegionHint,
  lat = null,
  lng = null,
  onUpdated,
}: GlobeContextHubPanelProps) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectServiceId, setConnectServiceId] = useState<string | null>(null);
  const [ticketConnectOpen, setTicketConnectOpen] = useState(false);
  const [qrViewer, setQrViewer] = useState<{
    src: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const panel = useMemo(() => {
    void revision;
    void destinationLabel;
    return listContextHubServicesForEvent(event);
  }, [destinationLabel, event, revision]);

  const semanticHint = useMemo(
    () => resolveSemanticMainHintForEvent(event),
    [event, revision],
  );

  const serviceRows = useMemo(
    () =>
      panel
        ? rankContextHubServices(panel.services, semanticHint).filter(
            (row) => row.implemented,
          )
        : [],
    [panel, semanticHint],
  );

  const bump = useCallback(() => {
    setRevision((value) => value + 1);
    onUpdated?.();
  }, [onUpdated]);

  const handleOpenAction = useCallback(
    (url: string, label: string) => {
      recordContextHubTelemetry({ event, kind: "clicked", label });
      recordContextHubTelemetry({ event, kind: "executed", label });
      foldContextHubLearning(event);
      openExternalHref(url);
    },
    [event],
  );

  const openTicketQrViewer = useCallback(
    (href: string, label: string) => {
      recordContextHubTelemetry({ event, kind: "clicked", label });
      recordContextHubTelemetry({ event, kind: "executed", label });
      foldContextHubLearning(event);
      setQrViewer({
        src: href,
        title: label,
        subtitle: panel?.contextPlace ?? undefined,
      });
    },
    [event, panel?.contextPlace],
  );

  const handleOpenHandoff = useCallback(
    (href: string, label: string, internalRoute = false) => {
      if (internalRoute) {
        writeGlobeOrchestratorScopeHint({
          pinScope: resolvePinScopeFromEventId(event.id) ?? "internal",
          eventId: event.id,
          title: event.title,
        });
      }
      recordContextHubTelemetry({ event, kind: "clicked", label });
      recordContextHubTelemetry({ event, kind: "executed", label });
      foldContextHubLearning(event);
      if (internalRoute) {
        router.push(href);
        return;
      }
      if (isTicketQrViewerHref(href)) {
        openTicketQrViewer(href, label);
        return;
      }
      openExternalHref(href);
    },
    [event, openTicketQrViewer, router],
  );

  const handleConnectFlight = useCallback(
    async (airportId: DepartureHubAirportId) => {
      if (busy) {
        return;
      }
      setBusy(true);
      try {
        connectDepartureHubToContext({
          destinationEventId: event.id,
          airportId,
          homeRegionHint,
        });
        const label =
          panel?.services
            .find((row) => row.serviceId === "flight")
            ?.flightOptions.find((row) => row.id === airportId)?.shortLabelKo ?? airportId;
        toast.success(copy.globe.departureHubConnected(label));
        recordContextHubTelemetry({ event, kind: "clicked", label: airportId });
        foldContextHubLearning(event);
        setConnectServiceId(null);
        bump();
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
    [busy, bump, event, homeRegionHint, panel?.services],
  );

  const handleConnectLodging = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await enableLodgingHubForContext({
        contextEventId: event.id,
        lat,
        lng,
      });
      toast.success(copy.globe.lodgingHubConnected);
      recordContextHubTelemetry({ event, kind: "executed", label: "lodging" });
      foldContextHubLearning(event);
      bump();
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.lodgingHubConnectFail,
      );
    } finally {
      setBusy(false);
    }
  }, [busy, bump, event, lat, lng]);

  if (!panel || serviceRows.length === 0) {
    return null;
  }

  return (
    <>
      <GlobeContextTicketConnectSheet
        open={ticketConnectOpen}
        onOpenChange={setTicketConnectOpen}
        contextEventId={event.id}
        onSaved={bump}
      />
      <GlobeTicketQrViewer
        open={Boolean(qrViewer)}
        onOpenChange={(open) => {
          if (!open) {
            setQrViewer(null);
          }
        }}
        qrSrc={qrViewer?.src ?? null}
        title={qrViewer?.title ?? null}
        subtitle={qrViewer?.subtitle ?? null}
      />
      <section className="space-y-2.5" data-globe-context-hub-panel>
        <div>
          <p className="text-[12px] font-semibold text-primary">
            {copy.globe.contextHubEyebrow}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">
            {copy.globe.contextHubSectionTitle}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {copy.globe.contextHubSectionBody}
          </p>
        </div>

        <ul className="space-y-2">
          {serviceRows.map((row) => (
            <HubServiceSlot
              key={row.serviceId}
              row={row}
              connectOpen={connectServiceId === row.serviceId}
              busy={busy}
              onToggleConnect={() => {
                if (row.serviceId === "ticket") {
                  setTicketConnectOpen(true);
                  return;
                }
                if (row.serviceId === "lodging") {
                  void handleConnectLodging();
                  return;
                }
                setConnectServiceId((current) =>
                  current === row.serviceId ? null : row.serviceId,
                );
              }}
              onConnectFlight={(airportId) => void handleConnectFlight(airportId)}
              onConnectLodging={() => void handleConnectLodging()}
              onOpenAction={handleOpenAction}
              onOpenHandoff={handleOpenHandoff}
            />
          ))}
        </ul>
      </section>
    </>
  );
}
