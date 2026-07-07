"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GlobeContextBrainStrip } from "@/components/globe/globe-context-brain-strip";
import { GlobeContextGuideSection } from "@/components/globe/globe-context-guide-section";
import { GlobeHubServiceList } from "@/components/globe/globe-hub-service-list";
import { GlobeContextTicketConnectSheet } from "@/components/globe/globe-context-ticket-connect-sheet";
import { GlobeTicketQrViewer } from "@/components/globe/globe-ticket-qr-viewer";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import { enableLodgingHubForContext } from "@/lib/globe/context-hub/enable-lodging-hub-for-context";
import {
  listContextHubServicesForEvent,
  type ContextHubServiceId,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
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
import { dispatchGlobeMarketHubConnect } from "@/lib/globe/context-hub/globe-market-hub-bridge";
import { expandMediaGuideOnMap } from "@/lib/globe/expand-media-guide-on-map";
import { copy } from "@/lib/copy/human-ko";
import { useContextMediaGuides } from "@/hooks/use-context-media-guides";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";

export type GlobeContextHubPanelProps = {
  event: EventCandidate;
  destinationLabel?: string | null;
  homeRegionHint?: string | null;
  lat?: number | null;
  lng?: number | null;
  onUpdated?: () => void;
  /** Bridge embed — service list only, no brain/guide chrome. */
  minimal?: boolean;
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
  minimal = false,
}: GlobeContextHubPanelProps) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectServiceId, setConnectServiceId] = useState<ContextHubServiceId | null>(null);
  const [ticketConnectOpen, setTicketConnectOpen] = useState(false);
  const [qrViewer, setQrViewer] = useState<{
    src: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const { guides: mediaGuides, loading: mediaGuidesLoading } = useContextMediaGuides(event, {
    max: 3,
  });

  const panel = useMemo(() => {
    void revision;
    void destinationLabel;
    return listContextHubServicesForEvent(event);
  }, [destinationLabel, event, revision]);

  const semanticHint = useMemo(
    () => resolveSemanticMainHintForEvent(event),
    [event],
  );
  const flightService = useMemo(
    () => panel?.services.find((row) => row.serviceId === "flight") ?? null,
    [panel],
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
          flightService?.flightOptions.find((row) => row.id === airportId)?.shortLabelKo ??
          airportId;
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
    [busy, bump, event, flightService, homeRegionHint],
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

  const handleConnectMarket = useCallback(() => {
    recordContextHubTelemetry({ event, kind: "clicked", label: "market" });
    dispatchGlobeMarketHubConnect({ eventId: event.id });
  }, [event]);

  const handleExpandGuideMap = useCallback(
    (guide: MediaGuideNode) => {
      const ok = expandMediaGuideOnMap({ event, guide });
      if (!ok) {
        toast.error(copy.common.tryAgain);
      }
    },
    [event],
  );

  if (!panel) {
    return null;
  }

  const hubSection =
    serviceRows.length > 0 ? (
      <GlobeHubServiceList
        rows={serviceRows}
        busy={busy}
        connectServiceId={connectServiceId}
        initialVisibleCount={2}
        onToggleConnect={(row) => {
            if (row.serviceId === "ticket") {
              setTicketConnectOpen(true);
              return;
            }
            if (row.serviceId === "lodging") {
              void handleConnectLodging();
              return;
            }
            if (row.serviceId === "market") {
              handleConnectMarket();
              return;
            }
            setConnectServiceId((current) =>
              current === row.serviceId ? null : row.serviceId,
            );
          }}
          onConnectFlight={(airportId) => void handleConnectFlight(airportId)}
          onConnectLodging={() => void handleConnectLodging()}
          onConnectMarket={handleConnectMarket}
          onOpenAction={handleOpenAction}
          onOpenHandoff={handleOpenHandoff}
        />
    ) : null;

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
        {!minimal ? <GlobeContextBrainStrip event={event} /> : null}
        {!minimal ? (
          <GlobeContextGuideSection
            guides={mediaGuides}
            loading={mediaGuidesLoading}
            onExpandGuideMap={handleExpandGuideMap}
          />
        ) : null}
        {hubSection}
      </section>
    </>
  );
}
